function pad(n){return n.toString().padStart(2,'0')}

function tick(){
  const now = new Date();
  document.querySelectorAll('.card .timer').forEach(timer => {
    const targetIso = timer.getAttribute('data-target');
    const target = new Date(targetIso);
    const diff = target - now;
    const status = timer.parentElement.querySelector('.status');

    if (diff <= 0){
      timer.classList.add('hidden');
      status.classList.remove('hidden');
      status.textContent = "Es ist soweit!";
      return;
    }

    const totalSeconds = Math.floor(diff/1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    timer.querySelector('[data-part="days"]').textContent = days;
    timer.querySelector('[data-part="hours"]').textContent = pad(hours);
    timer.querySelector('[data-part="minutes"]').textContent = pad(minutes);
    timer.querySelector('[data-part="seconds"]').textContent = pad(seconds);
  })
}

tick();
setInterval(tick, 1000);
