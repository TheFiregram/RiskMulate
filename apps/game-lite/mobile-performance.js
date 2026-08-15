export function getMobilePerformanceProfile() {
  const coarsePointer = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  const narrowViewport = typeof innerWidth === 'number' && innerWidth <= 900;
  const lowMemory = typeof navigator !== 'undefined' && Number.isFinite(navigator.deviceMemory) && navigator.deviceMemory <= 4;
  const mobileLite = coarsePointer || narrowViewport || lowMemory;

  if (typeof window !== 'undefined') {
    window.RiskMulateMobilePerformance = {
      mobileLite,
      coarsePointer,
      narrowViewport,
      lowMemory,
      deviceMemory: navigator.deviceMemory ?? null,
      viewportWidth: innerWidth,
    };
  }

  return { mobileLite, coarsePointer, narrowViewport, lowMemory };
}
