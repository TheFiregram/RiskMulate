//! Stable scheduled-event queue.
#![allow(missing_docs)]
use std::collections::BTreeMap;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Event {
    pub id: String,
    pub tick: u64,
    pub priority: i32,
    pub title: String,
}
#[derive(Default)]
pub struct EventQueue {
    events: BTreeMap<(u64, i32, String), Event>,
}
impl EventQueue {
    pub fn schedule(&mut self, event: Event) {
        self.events
            .insert((event.tick, -event.priority, event.id.clone()), event);
    }
    pub fn due(&mut self, tick: u64) -> Vec<Event> {
        let keys: Vec<_> = self
            .events
            .keys()
            .filter(|(at, _, _)| *at <= tick)
            .cloned()
            .collect();
        keys.into_iter()
            .filter_map(|key| self.events.remove(&key))
            .collect()
    }
    #[must_use]
    pub fn len(&self) -> usize {
        self.events.len()
    }
    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.events.is_empty()
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn orders_due_events_deterministically() {
        let mut q = EventQueue::default();
        q.schedule(Event {
            id: "b".into(),
            tick: 2,
            priority: 1,
            title: "B".into(),
        });
        q.schedule(Event {
            id: "a".into(),
            tick: 2,
            priority: 2,
            title: "A".into(),
        });
        assert_eq!(q.due(2)[0].id, "a");
    }
}
