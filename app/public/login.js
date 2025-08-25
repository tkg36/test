let button = document.getElementById("submit");

button.addEventListener("click", login);

function login(){

    let usn = document.getElementById("username").value;
    let pwd = document.getElementById("password").value;

    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: usn,
            password: pwd
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log(data);
        if (data.message === "Login successful.") {
            window.location.href = "roverCam.html";
        } else {
            alert("Login failed: " + (data.error || "Unknown error"));
        }
    })
    .catch(error => {
        console.error(error);
    });
}
