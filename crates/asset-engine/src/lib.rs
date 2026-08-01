//! Typed simulated-asset registry.
#![allow(missing_docs)]
use std::collections::BTreeMap;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Asset {
    pub id: String,
    pub kind: String,
    pub name: String,
    pub status: String,
    pub properties: BTreeMap<String, String>,
}
#[derive(Default)]
pub struct AssetRegistry {
    assets: BTreeMap<String, Asset>,
}
impl AssetRegistry {
    pub fn insert(&mut self, asset: Asset) -> bool {
        self.assets.insert(asset.id.clone(), asset).is_none()
    }
    pub fn update_status(&mut self, id: &str, status: &str) -> bool {
        self.assets.get_mut(id).is_some_and(|asset| {
            asset.status = status.into();
            true
        })
    }
    #[must_use]
    pub fn visible(&self) -> Vec<&Asset> {
        self.assets.values().collect()
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn updates_assets() {
        let mut r = AssetRegistry::default();
        r.insert(Asset {
            id: "server".into(),
            kind: "system".into(),
            name: "API".into(),
            status: "online".into(),
            properties: BTreeMap::new(),
        });
        assert!(r.update_status("server", "offline"));
        assert_eq!(r.visible()[0].status, "offline");
    }
}
