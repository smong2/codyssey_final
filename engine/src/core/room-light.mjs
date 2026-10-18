const BACKGROUNDS={day:'BG11_myroom2_day_1920x1080_023.png',sunset:'BG11_myroom2_sunset_1920x1080_024.png'};
export function createRoomLight(){
 let time='day';return {get time(){return time;},get background(){return BACKGROUNDS[time];},event(event){if(event==='complete')time='sunset';else if(['start','next-day','resume'].includes(event))time='day';}};
}
