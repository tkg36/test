let button = document.getElementById("submit");
let images = document.getElementById("photos");
let nextButton = document.getElementById("next");
let prevButton = document.getElementById("previous");
let timelapseButton = document.getElementById("timelapse");
let pauseButton = document.getElementById("pause");
let cameraOptions = document.getElementById("camera");
let errosMsg = document.getElementById("errors");
let slider = document.getElementById("speedRange");
let speed = slider.value;

let recContainer = document.getElementById("add");
function addDayToRecTable(day) {
  let addSolDay = document.createElement("p");
  addSolDay.textContent = day;
  recContainer.appendChild(addSolDay);
}

function addCamera(camArr) {
  for (let i = 0; i < camArr.length; i++) {
    let camEntry = document.createElement("option");
    camEntry.value = camArr[i];
    camEntry.textContent = camArr[i];
    cameraOptions.appendChild(camEntry);
  }
}

function getManifest(camArr, rover) {
  let url = `/getManifest?rover=${rover}`;
  fetch(url).then((response) => response.json())
    .then((body) => {
      let manifestLen = body.length;
      //console.log(body);
      for (let i = 0; i < manifestLen; i++) {
        if (body[i].total_photos >= 300) {
          addDayToRecTable(body[i].sol);
        }
        camArr[body[i].sol]=body[i].cameras;
      }
      //console.log(camArr)
    }).catch(error => console.log(error));
}

let currentSrc = 0;
let isIntervalOn = false;
let interval;

function timelaspe() {
  if(isIntervalOn == false){
    interval = setInterval(function () {
      getNextPhotos();
    }, speed);
    isIntervalOn = true;
  }
}

function stopInterval() {
  clearInterval(interval);
  isIntervalOn = false;
}

function getNextPhotos() {
  if (currentSrc < photosArr.length) {
    images.src = photosArr[currentSrc];
    currentSrc += 1;
  } else {
    currentSrc = 0;
  }
}

function getPrevPhotos() {
  if (currentSrc > 0) {
    images.src = photosArr[currentSrc];
    currentSrc -= 1;
  } else {
    currentSrc = 0;
  }
}

function submit(srcArr) {
  stopInterval();
  let dayInput = document.getElementById("day").value;
  let roverInput = document.getElementById("rover").value;
  let cameraInput = document.getElementById("camera").value;
  let url = `/getPhotos?solday=${dayInput}&camera=${cameraInput}&rover=${roverInput}`;
  fetch(url).then((response) => response.json())
    .then((body) => {
      let maxLen = body.photos.length;
      console.log(body)
      for (let i = 0; i < maxLen; i++) {
        const imageSource = body.photos[i].img_src.toString();
        srcArr.push(imageSource);
      }
      if (srcArr.length > 0) {
        errosMsg.textContent=`There are ${maxLen} photos here`;
        images.src = body.photos[0].img_src.toString();
      }
      else{
        errosMsg.textContent="There are no photos from this camera, please choose another";
      }
    }).catch(error => console.log(error));
}

function nextButtonClicked() {
  if (isIntervalOn) { stopInterval(); }
  getNextPhotos();
}

function prevButtonClicked() {
  if (isIntervalOn) { stopInterval(); }
  getPrevPhotos();
}

let avaliableCams = [];
const roverInput = document.getElementById("rover");
let roverName = document.getElementById("rovername");
roverInput.addEventListener('change', () => {
  avaliableCams = {};
  recContainer.textContent = "";
  roverName.textContent = roverInput.value.charAt(0).toUpperCase() + roverInput.value.slice(1) + " Available Sol Days";
  getManifest(avaliableCams, roverInput.value);
});

let getCams = document.getElementById("getCams");
getCams.addEventListener("click", () => {
  cameraOptions.textContent = "";
  let defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Please choose camera";
  cameraOptions.appendChild(defaultOption);
  let dayInput = document.getElementById("day").value;
  if (dayInput !== "" && roverInput.value !== "") {
    addCamera(avaliableCams[dayInput]);
  } else {
    console.log("Error: input day and rover");
  }
});

function nextButtonClicked() {
  if (isIntervalOn) { stopInterval(); }
  getNextPhotos();
}

function prevButtonClicked() {
  if (isIntervalOn) { stopInterval(); }
  getPrevPhotos();
}

let photosArr = [];
let firstClick = true;
function submitClick() {
  errosMsg.textContent = "";
  if (!firstClick) {
    photosArr = [];
    currentSrc = 0;
  }
  submit(photosArr);
  firstClick = false;
}

button.addEventListener("click", submitClick);
nextButton.addEventListener("click", nextButtonClicked);
prevButton.addEventListener("click", prevButtonClicked);
pauseButton.addEventListener("click", stopInterval);
timelapseButton.addEventListener("click", timelaspe);
slider.addEventListener('input', function() {
  speed = parseInt(this.value);
  //console.log("speed",speed)
  if(isIntervalOn){
    stopInterval()
    timelaspe()
  }

});

const socket = io();

function voteBtnClicked() {
  const voteBtn = document.getElementById("vote");

  const userId = socket.id; // TODO: change
  const dayValue    = document.getElementById("day").value;
  const roverValue  = document.getElementById("rover").value;
  const cameraValue = document.getElementById("camera").value;

  if (!dayValue || !roverValue || !cameraValue) {
    return;
  }

  const voteData = {userId, dayValue, roverValue, cameraValue};

  socket.emit('userVote', voteData, (response) => {
    if (response.success) {
      voteBtn.disabled = true;
      voteBtn.style.display = "none";
    } else {
      voteBtn.disabled = false;
      voteBtn.style.display = "inline";
    }
  });
}

document.addEventListener('DOMContentLoaded', function() {
  const voteBtn = document.getElementById("vote");
  voteBtn.disabled = true;
  voteBtn.style.display = "none";

  voteBtn.addEventListener('click', voteBtnClicked);

  socket.on('pollOpen', () => {
    voteBtn.disabled = false;
    voteBtn.style.display = "inline";
    console.log("Poll is now open");
  });

  socket.on('pollClosed', () => {
    voteBtn.disabled = true;
    voteBtn.style.display = "none";
    console.log("Poll is now closed");
  });
});

