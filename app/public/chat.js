const socket = io({
  auth: {
    serverOffset: 0
  },
  // enable retries
  ackTimeout: 10000,
  retries: 3,
});


let counter = 0;

const hexToRgb = hex =>
  hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i
             ,(m, r, g, b) => '#' + r + r + g + g + b + b)
    .substring(1).match(/.{2}/g)
    .map(x => parseInt(x, 16))

window.onload = function init(){
  initEventListeners();
}

function initEventListeners() {
  const form = document.getElementById('form');
  const input = document.getElementById('input');
  const chatWidget = document.querySelector('.chat-widget');

  form.addEventListener('submit', (e) => {
    e.preventDefault(); // Prevent page reload on form submit
    if (input.value) {
      const clientOffset = `${socket.id}-${counter++}`;
      const timeStamp = new Date().toISOString();
      socket.emit('chat message', socket.id, input.value, clientOffset, timeStamp, acknowledgementCallback);
      input.value = '';
    }
  });

  socket.on('chat message', (user, msg, serverOffset) => {
    console.log("user:",user);
    console.log("msg:",msg);
    const chatItem = document.createElement('div');
    chatItem.classList.add('chat__item');

    const chatUser = document.createElement('span');
    chatUser.classList.add('chat__user');
    chatUser.textContent = `${user}:`;
    chatItem.appendChild(chatUser);

    const chatMessage = document.createElement('span');
    chatMessage.classList.add('chat__message');
    chatMessage.textContent = msg;
    chatItem.appendChild(chatMessage);

    chatItem.style.setProperty('--user-color', user.toHex());
    chatItem.style.setProperty('--user-color-rgb', hexToRgb(user.toHex()));
    chatItem.appendChild(chatMessage);

    chatWidget.appendChild(chatItem);

    window.scrollTo(0, document.body.scrollHeight);
    socket.auth.serverOffset = serverOffset;
  });
}

function acknowledgementCallback(ack) {
  if (ack && ack.success) {
    console.log('Acknowledged: stop retrying');
  } else {
    console.error('Acknowledgment failed, will retry...');
  }
}

String.prototype.toHex = function() {
  let hash = 0;
  if (this.length === 0)
    return hash;
  for (let i = 0; i < this.length; i++) {
    hash = this.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    let value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  return color;
}