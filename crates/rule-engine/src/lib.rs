//! Configurable numeric rule evaluation.
#![allow(missing_docs)]
use std::collections::BTreeMap;

#[derive(Clone, Debug, PartialEq)]
pub enum Condition {
    Exists(String),
    AtLeast(String, f64),
    All(Vec<Condition>),
    Any(Vec<Condition>),
    Not(Box<Condition>),
}

#[derive(Clone, Debug, PartialEq)]
pub struct Decision {
    pub allowed: bool,
    pub reasons: Vec<String>,
}

#[must_use]
pub fn evaluate(condition: &Condition, values: &BTreeMap<String, f64>) -> Decision {
    fn check(
        condition: &Condition,
        values: &BTreeMap<String, f64>,
        reasons: &mut Vec<String>,
    ) -> bool {
        match condition {
            Condition::Exists(key) => {
                values.contains_key(key) || {
                    reasons.push(format!("missing {key}"));
                    false
                }
            }
            Condition::AtLeast(key, minimum) => {
                values.get(key).is_some_and(|value| value >= minimum) || {
                    reasons.push(format!("{key} must be at least {minimum}"));
                    false
                }
            }
            #[allow(clippy::unnecessary_fold)]
            Condition::All(items) => items
                .iter()
                .fold(true, |valid, item| check(item, values, reasons) && valid),
            Condition::Any(items) => {
                let valid = items.iter().any(|item| check(item, values, &mut vec![]));
                if !valid {
                    reasons.push("no alternative condition passed".into());
                }
                valid
            }
            Condition::Not(item) => !check(item, values, &mut vec![]),
        }
    }
    let mut reasons = vec![];
    let allowed = check(condition, values, &mut reasons);
    Decision { allowed, reasons }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn evaluates_nested_rules() {
        let values = BTreeMap::from([("approvals".into(), 2.0)]);
        assert!(
            evaluate(
                &Condition::All(vec![
                    Condition::Exists("approvals".into()),
                    Condition::AtLeast("approvals".into(), 2.0)
                ]),
                &values
            )
            .allowed
        );
    }
}
