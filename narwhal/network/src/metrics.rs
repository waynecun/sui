// Copyright (c) 2022, Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
use anemo_tower::callback::{MakeCallbackHandler, ResponseHandler};
use prometheus::{
    register_histogram_vec_with_registry, register_int_counter_vec_with_registry,
    register_int_gauge_vec_with_registry, HistogramTimer, HistogramVec, IntCounterVec, IntGaugeVec,
    Registry,
};
use std::sync::Arc;

#[derive(Clone, Debug)]
pub struct NetworkConnectionMetrics {
    /// The connection status of a peer. 0 if not connected, 1 if connected.
    pub network_peer_connected: IntGaugeVec,
}

impl NetworkConnectionMetrics {
    pub fn new(node: &'static str, registry: &Registry) -> Self {
        Self {
            network_peer_connected: register_int_gauge_vec_with_registry!(
                format!("{node}_network_peer_connected"),
                "The connection status of a peer. 0 if not connected, 1 if connected",
                &["peer_id"],
                registry
            )
            .unwrap(),
        }
    }
}

#[derive(Clone)]
pub struct NetworkMetrics {
    /// Counter of requests by route
    requests: IntCounterVec,
    /// Request latency by route
    request_latency: HistogramVec,
    /// Request size by route
    request_size: HistogramVec,
    /// Response size by route
    response_size: HistogramVec,
    /// Gauge of the number of inflight requests at any given time by route
    inflight_requests: IntGaugeVec,
    /// Failed requests by route
    errors: IntCounterVec,
}

const LATENCY_SEC_BUCKETS: &[f64] = &[
    0.001, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1., 2.5, 5., 10., 20., 30., 60., 90.,
];

impl NetworkMetrics {
    pub fn new(node: &'static str, direction: &'static str, registry: &Registry) -> Self {
        // Buckets from 1kb to 8mb by powers of 2
        let size_byte_buckets = prometheus::exponential_buckets(1024.0, 2.0, 15).unwrap();

        let requests = register_int_counter_vec_with_registry!(
            format!("{node}_{direction}_requests"),
            "The number of requests made on the network",
            &["route"],
            registry
        )
        .unwrap();

        let request_latency = register_histogram_vec_with_registry!(
            format!("{node}_{direction}_request_latency"),
            "Latency of a request by route",
            &["route"],
            LATENCY_SEC_BUCKETS.to_vec(),
            registry,
        )
        .unwrap();

        let request_size = register_histogram_vec_with_registry!(
            format!("{node}_{direction}_request_size"),
            "Size of a request by route",
            &["route"],
            size_byte_buckets.clone(),
            registry,
        )
        .unwrap();

        let response_size = register_histogram_vec_with_registry!(
            format!("{node}_{direction}_response_size"),
            "Size of a response by route",
            &["route"],
            size_byte_buckets,
            registry,
        )
        .unwrap();

        let inflight_requests = register_int_gauge_vec_with_registry!(
            format!("{node}_{direction}_inflight_requests"),
            "The number of inflight network requests",
            &["route"],
            registry
        )
        .unwrap();

        let errors = register_int_counter_vec_with_registry!(
            format!("{node}_{direction}_request_errors"),
            "Number of errors by route",
            &["route", "status"],
            registry,
        )
        .unwrap();

        Self {
            requests,
            request_latency,
            request_size,
            response_size,
            inflight_requests,
            errors,
        }
    }
}

#[derive(Clone)]
pub struct MetricsMakeCallbackHandler {
    metrics: Arc<NetworkMetrics>,
}

impl MetricsMakeCallbackHandler {
    pub fn new(metrics: Arc<NetworkMetrics>) -> Self {
        Self { metrics }
    }
}

impl MakeCallbackHandler for MetricsMakeCallbackHandler {
    type Handler = MetricsResponseHandler;

    fn make_handler(&self, request: &anemo::Request<bytes::Bytes>) -> Self::Handler {
        let route = request.route().to_owned();

        self.metrics.requests.with_label_values(&[&route]).inc();
        self.metrics
            .inflight_requests
            .with_label_values(&[&route])
            .inc();
        self.metrics
            .request_size
            .with_label_values(&[&route])
            .observe(request.body().len() as f64);

        let timer = self
            .metrics
            .request_latency
            .with_label_values(&[&route])
            .start_timer();

        MetricsResponseHandler {
            metrics: self.metrics.clone(),
            timer,
            route,
        }
    }
}

pub struct MetricsResponseHandler {
    metrics: Arc<NetworkMetrics>,
    // The timer is held on to and "observed" once dropped
    #[allow(unused)]
    timer: HistogramTimer,
    route: String,
}

impl ResponseHandler for MetricsResponseHandler {
    fn on_response(self, response: &anemo::Response<bytes::Bytes>) {
        self.metrics
            .response_size
            .with_label_values(&[&self.route])
            .observe(response.body().len() as f64);

        if !response.status().is_success() {
            let status = response.status().to_u16().to_string();
            self.metrics
                .errors
                .with_label_values(&[&self.route, &status])
                .inc();
        }
    }

    fn on_error<E>(self, _error: &E) {
        self.metrics
            .errors
            .with_label_values(&[&self.route, "unknown"])
            .inc();
    }
}

impl Drop for MetricsResponseHandler {
    fn drop(&mut self) {
        self.metrics
            .inflight_requests
            .with_label_values(&[&self.route])
            .dec();
    }
}
