use axum::{
    extract::Query,
    response::{Html, IntoResponse},
    routing::get,
    Router,
};
use reqwest::Client;
use std::net::SocketAddr;
use serde::Deserialize;

#[derive(Deserialize)]
struct ProxyParams {
    url: String,
}

async fn proxy(Query(params): Query<ProxyParams>) -> impl IntoResponse {
    let client = Client::new();
    match client.get(&params.url).send().await {
        Ok(resp) => {
            match resp.text().await {
                Ok(body) => Html(body),
                Err(_) => Html("抓取网页内容失败".to_string()),
            }
        }
        Err(_) => Html("请求目标网页失败".to_string()),
    }
}

#[tokio::main]
async fn main() {
    let app = Router::new().route("/proxy", get(proxy));
    let addr = SocketAddr::from(([127, 0, 0, 1], 8080));
    println!("代理服务运行在 http://{}", addr);
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}
