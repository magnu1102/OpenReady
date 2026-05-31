use keyring::{Entry, Error as KeyringError};
use reqwest::header::{ACCEPT, AUTHORIZATION, HeaderMap, HeaderValue, USER_AGENT};
use serde::{Deserialize, Serialize};

const GITHUB_API_BASE_URL: &str = "https://api.github.com";
const GITHUB_API_VERSION: &str = "2022-11-28";
const KEYCHAIN_SERVICE: &str = "dev.openready.app";
const KEYCHAIN_USER: &str = "github-token";
const KEYCHAIN_AI_KEY: &str = "ai-provider-key";
const AI_REQUEST_TIMEOUT_SECONDS: u64 = 60;
const AI_MAX_TOKENS_CAP: u32 = 2048;

#[derive(Debug, Serialize)]
struct TokenStatus {
    configured: bool,
}

#[derive(Debug, Serialize)]
struct AiConfigStatus {
    configured: bool,
}

#[derive(Debug, Serialize)]
struct AiChatResponse {
    status: u16,
    body: String,
}

#[derive(Debug, Deserialize)]
struct AiChatMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct AiChatQuery {
    base_url: String,
    model: String,
    messages: Vec<AiChatMessage>,
    #[serde(default)]
    temperature: Option<f32>,
    #[serde(default)]
    max_tokens: Option<u32>,
}

#[derive(Debug, Serialize)]
struct GitHubProxyResponse {
    status: u16,
    body: String,
    rate_limit_remaining: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GitHubGetQuery {
    path: String,
    query: Vec<(String, String)>,
}

#[tauri::command]
async fn get_github_token_status() -> Result<TokenStatus, String> {
    Ok(TokenStatus {
        configured: read_github_token()
            .map(|token| !token.is_empty())
            .unwrap_or(false),
    })
}

#[tauri::command]
async fn validate_and_store_github_token(token: String) -> Result<TokenStatus, String> {
    let token = token.trim().to_string();
    if token.is_empty() {
        return Err("Enter a GitHub token before saving.".into());
    }

    validate_token_with_github(&token).await?;
    keychain_entry(KEYCHAIN_USER)?
        .set_password(&token)
        .map_err(keychain_message)?;
    Ok(TokenStatus { configured: true })
}

#[tauri::command]
async fn delete_github_token() -> Result<TokenStatus, String> {
    match keychain_entry(KEYCHAIN_USER)?.delete_credential() {
        Ok(()) | Err(KeyringError::NoEntry) => Ok(TokenStatus { configured: false }),
        Err(error) => Err(keychain_message(error)),
    }
}

#[tauri::command]
async fn github_get(input: GitHubGetQuery) -> Result<GitHubProxyResponse, String> {
    if !is_allowed_github_request(&input.path, &input.query) {
        return Err("Blocked unsupported GitHub API request.".into());
    }

    github_request(&input.path, &input.query, read_github_token().ok()).await
}

#[tauri::command]
async fn get_ai_config_status() -> Result<AiConfigStatus, String> {
    Ok(AiConfigStatus {
        configured: read_ai_key()
            .map(|key| !key.is_empty())
            .unwrap_or(false),
    })
}

#[tauri::command]
async fn store_ai_config(key: String) -> Result<AiConfigStatus, String> {
    let key = key.trim().to_string();
    if key.is_empty() {
        return Err("Enter an API key before saving.".into());
    }

    keychain_entry(KEYCHAIN_AI_KEY)?
        .set_password(&key)
        .map_err(keychain_message)?;
    Ok(AiConfigStatus { configured: true })
}

#[tauri::command]
async fn delete_ai_config() -> Result<AiConfigStatus, String> {
    match keychain_entry(KEYCHAIN_AI_KEY)?.delete_credential() {
        Ok(()) | Err(KeyringError::NoEntry) => Ok(AiConfigStatus { configured: false }),
        Err(error) => Err(keychain_message(error)),
    }
}

#[tauri::command]
async fn ai_chat(input: AiChatQuery) -> Result<AiChatResponse, String> {
    ai_chat_request(input, read_ai_key().ok()).await
}

fn validate_ai_chat_input(base_url: &str, model: &str, message_count: usize) -> Result<(), String> {
    if base_url.is_empty() {
        return Err("Set an AI provider base URL in Settings before generating.".into());
    }
    if !(base_url.starts_with("http://") || base_url.starts_with("https://")) {
        return Err("The AI provider base URL must start with http:// or https://.".into());
    }
    if model.trim().is_empty() {
        return Err("Set an AI model name in Settings before generating.".into());
    }
    if message_count == 0 {
        return Err("OpenReady built an empty AI request.".into());
    }
    Ok(())
}

async fn ai_chat_request(
    input: AiChatQuery,
    key: Option<String>,
) -> Result<AiChatResponse, String> {
    let base_url = input.base_url.trim().trim_end_matches('/');
    validate_ai_chat_input(base_url, &input.model, input.messages.len())?;

    let key = key.filter(|value| !value.is_empty());
    // A local model (e.g. Ollama) may not require a key; remote providers do.
    // We send the Authorization header only when a key is stored.

    let url = format!("{base_url}/chat/completions");
    let max_tokens = input.max_tokens.unwrap_or(AI_MAX_TOKENS_CAP).min(AI_MAX_TOKENS_CAP);
    let messages: Vec<serde_json::Value> = input
        .messages
        .iter()
        .map(|message| {
            serde_json::json!({ "role": message.role, "content": message.content })
        })
        .collect();
    let payload = serde_json::json!({
        "model": input.model,
        "messages": messages,
        "temperature": input.temperature.unwrap_or(0.4),
        "max_tokens": max_tokens,
    });

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(AI_REQUEST_TIMEOUT_SECONDS))
        .build()
        .map_err(|_| "OpenReady could not start the AI request.".to_string())?;

    let mut request = client
        .post(&url)
        .header(USER_AGENT, "OpenReady")
        .json(&payload);
    if let Some(key) = key {
        request = request.bearer_auth(key);
    }

    let response = request
        .send()
        .await
        .map_err(|_| "Could not reach the AI provider. Check the base URL and your connection.".to_string())?;
    let status = response.status().as_u16();
    let body = response
        .text()
        .await
        .map_err(|_| "The AI provider returned a response OpenReady could not read.".to_string())?;

    Ok(AiChatResponse { status, body })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            ai_chat,
            delete_ai_config,
            delete_github_token,
            get_ai_config_status,
            get_github_token_status,
            github_get,
            store_ai_config,
            validate_and_store_github_token
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

async fn validate_token_with_github(token: &str) -> Result<(), String> {
    let response = github_request("/rate_limit", &[], Some(token.to_string())).await?;
    if (200..300).contains(&response.status) {
        Ok(())
    } else if response.status == 401 || response.status == 403 {
        Err("GitHub rejected that token. Check the token and try again.".into())
    } else {
        Err("OpenReady could not validate the token with GitHub. Try again later.".into())
    }
}

async fn github_request(
    path: &str,
    query: &[(String, String)],
    token: Option<String>,
) -> Result<GitHubProxyResponse, String> {
    let mut url = reqwest::Url::parse(&format!("{GITHUB_API_BASE_URL}{path}"))
        .map_err(|_| "OpenReady could not build the GitHub request.".to_string())?;
    for (key, value) in query {
        url.query_pairs_mut().append_pair(key, value);
    }

    let client = reqwest::Client::new();
    let mut headers = HeaderMap::new();
    headers.insert(ACCEPT, HeaderValue::from_static("application/vnd.github+json"));
    headers.insert("X-GitHub-Api-Version", HeaderValue::from_static(GITHUB_API_VERSION));
    headers.insert(USER_AGENT, HeaderValue::from_static("OpenReady"));
    if let Some(token) = token {
        let value = HeaderValue::from_str(&format!("Bearer {token}"))
            .map_err(|_| "Stored GitHub token is not valid for an HTTP header.".to_string())?;
        headers.insert(AUTHORIZATION, value);
    }

    let response = client
        .get(url)
        .headers(headers)
        .send()
        .await
        .map_err(|_| "Could not reach GitHub. Check your connection and try again.".to_string())?;
    let status = response.status().as_u16();
    let rate_limit_remaining = response
        .headers()
        .get("x-ratelimit-remaining")
        .and_then(|value| value.to_str().ok())
        .map(ToOwned::to_owned);
    let body = response
        .text()
        .await
        .map_err(|_| "GitHub returned a response OpenReady could not read.".to_string())?;

    Ok(GitHubProxyResponse {
        status,
        body,
        rate_limit_remaining,
    })
}

fn read_github_token() -> Result<String, KeyringError> {
    Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_USER)?.get_password()
}

fn read_ai_key() -> Result<String, KeyringError> {
    Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_AI_KEY)?.get_password()
}

fn keychain_entry(user: &str) -> Result<Entry, String> {
    Entry::new(KEYCHAIN_SERVICE, user).map_err(keychain_message)
}

fn keychain_message(error: KeyringError) -> String {
    match error {
        KeyringError::NoEntry => "No GitHub token is stored.".into(),
        _ => "OpenReady could not access the operating system credential store.".into(),
    }
}

fn is_allowed_github_request(path: &str, query: &[(String, String)]) -> bool {
    if !path.starts_with('/') || path.contains("://") || path.contains("..") {
        return false;
    }

    let segments: Vec<&str> = path.trim_matches('/').split('/').collect();
    match segments.as_slice() {
        ["rate_limit"] => query.is_empty(),
        ["users", username, "repos"] => {
            is_valid_segment(username)
                && query.iter().all(|(key, value)| match key.as_str() {
                    "sort" => value == "pushed",
                    "direction" => value == "desc",
                    "per_page" => value == "100",
                    _ => false,
                })
        }
        ["repos", owner, repo, "readme"] => {
            query.is_empty() && is_valid_segment(owner) && is_valid_segment(repo)
        }
        ["repos", owner, repo, "git", "trees", branch] => {
            is_valid_segment(owner)
                && is_valid_segment(repo)
                && is_valid_segment(branch)
                && query
                    .iter()
                    .all(|(key, value)| key == "recursive" && value == "1")
        }
        _ => false,
    }
}

fn is_valid_segment(segment: &str) -> bool {
    !segment.is_empty() && !segment.contains('/') && !segment.contains('\\')
}

#[cfg(test)]
mod tests {
    use super::{is_allowed_github_request, validate_ai_chat_input};

    #[test]
    fn ai_chat_input_accepts_well_formed_request() {
        assert!(validate_ai_chat_input("https://api.openai.com/v1", "gpt-4o-mini", 2).is_ok());
        assert!(validate_ai_chat_input("http://localhost:11434/v1", "llama3", 1).is_ok());
    }

    #[test]
    fn ai_chat_input_rejects_bad_requests() {
        assert!(validate_ai_chat_input("", "gpt-4o-mini", 1).is_err());
        assert!(validate_ai_chat_input("ftp://example.com", "gpt-4o-mini", 1).is_err());
        assert!(validate_ai_chat_input("https://api.openai.com/v1", "  ", 1).is_err());
        assert!(validate_ai_chat_input("https://api.openai.com/v1", "gpt-4o-mini", 0).is_err());
    }

    #[test]
    fn allows_openready_github_endpoints() {
        assert!(is_allowed_github_request(
            "/users/octocat/repos",
            &[
                ("sort".into(), "pushed".into()),
                ("direction".into(), "desc".into()),
                ("per_page".into(), "100".into())
            ],
        ));
        assert!(is_allowed_github_request("/repos/octocat/openready/readme", &[]));
        assert!(is_allowed_github_request(
            "/repos/octocat/openready/git/trees/main",
            &[("recursive".into(), "1".into())],
        ));
        assert!(is_allowed_github_request("/rate_limit", &[]));
    }

    #[test]
    fn blocks_unexpected_github_endpoints() {
        assert!(!is_allowed_github_request("/user/repos", &[]));
        assert!(!is_allowed_github_request(
            "/repos/octocat/openready/issues",
            &[]
        ));
        assert!(!is_allowed_github_request(
            "https://api.github.com/users/octocat/repos",
            &[]
        ));
        assert!(!is_allowed_github_request(
            "/users/octocat/repos",
            &[("per_page".into(), "500".into())],
        ));
    }
}
