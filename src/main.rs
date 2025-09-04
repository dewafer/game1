use axum::{
    extract::Query,
    response::{Html, IntoResponse},
    routing::get,
    Router,
};
use axum::http::Method;
use axum::routing::get_service;
use axum::http::StatusCode;
use reqwest::Client;
use std::net::SocketAddr;
use serde::Deserialize;
use tokio::net::TcpListener;
use tower_http::cors::{CorsLayer, Any};
use tower_http::services::ServeDir;

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
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET]);

    let static_files = get_service(ServeDir::new("./")).handle_error(|_| async {
        (StatusCode::INTERNAL_SERVER_ERROR, "静态文件服务出错")
    });

    let app = Router::new()
        .route("/proxy", get(proxy))
        .nest_service("/", static_files)
        .layer(cors);

    let addr = SocketAddr::from(([127, 0, 0, 1], 8080));
    println!("代理服务运行在 http://{}，静态文件托管在根目录", addr);

    let listener = TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
