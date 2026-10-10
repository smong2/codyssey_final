export function createResultGate(emit) {
  let emitted = false;
  return result => {
    if (emitted) return false;
    emitted = true;
    emit(result.outcome === 'quit' ? 'minigame:quit' : 'minigame:complete', result);
    return true;
  };
}
