use keyring::{Entry, Error as KeyringError};
use reqwest::header::{ACCEPT, AUTHORIZATION, HeaderMap, HeaderValue, USER_AGENT};
use serde::{Deserialize, Serialize};

const GITHUB_API_BASE_URL: &str = "https://api.github.com";
const GITHUB_API_VERSION: &str = "2022-11-28";
const KEYCHAIN_SERVICE: &str = "dev.openready.app";
const KEYCHAIN_USER: &str = "github-token";

#[derive(Debug, Serialize)]
struct TokenStatus {
    configured: bool,
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
    keychain_entry()?.set_password(&token).map_err(keychain_message)?;
    Ok(TokenStatus { configured: true })
}

#[tauri::command]
async fn delete_github_token() -> Result<TokenStatus, String> {
    match keychain_entry()?.delete_credential() {
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            delete_github_token,
            get_github_token_status,
            github_get,
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

fn keychain_entry() -> Result<Entry, String> {
    Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_USER).map_err(keychain_message)
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
    use super::is_allowed_github_request;

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
