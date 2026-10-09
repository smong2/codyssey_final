// Reconcile input after saved transitions/retries; an empty removed modal must resume input.
export function syncAdventurePause(game,{pending,modalOpen,windowPaused=false}){
 game?.pause(Boolean(pending||modalOpen||windowPaused));
}
