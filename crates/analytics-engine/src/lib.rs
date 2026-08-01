//! Local session analytics.
#![allow(missing_docs)]
#[derive(Clone, Debug, PartialEq)]
pub struct Metric {
    pub category: String,
    pub value: f64,
}
#[derive(Clone, Debug, PartialEq)]
pub struct Summary {
    pub total_score: i64,
    pub action_count: usize,
    pub violations: usize,
    pub average_response_ticks: f64,
}
#[must_use]
#[allow(clippy::cast_precision_loss)]
pub fn summarize(score: i64, responses: &[u64], violations: usize) -> Summary {
    Summary {
        total_score: score,
        action_count: responses.len(),
        violations,
        average_response_ticks: if responses.is_empty() {
            0.0
        } else {
            responses.iter().sum::<u64>() as f64 / responses.len() as f64
        },
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn summarizes_responses() {
        assert!((summarize(5, &[2, 4], 1).average_response_ticks - 3.0).abs() < f64::EPSILON);
    }
}
