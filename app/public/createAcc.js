let button = document.getElementById("submit");

button.addEventListener("click", createAcc);

function createAcc() {

    let usn = document.getElementById("username").value;
    let pwd = document.getElementById("password").value;

    fetch('/createAccount', {
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
        if (data.message === "Account created successfully.") {
            window.location.href = "roverCam.html";
        } else {
            alert ("Account creation failed: " + (data.error || "Unknown error"));
        }
    })
    .catch(error => {
        console.error(error);
    });
}
