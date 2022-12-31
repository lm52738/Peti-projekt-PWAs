import { get, set } from "https://cdn.jsdelivr.net/npm/idb-keyval@6/+esm";

let player = document.getElementById("player");
let canvas = document.getElementById("cnvFood");
let beforeSnap = document.getElementById("beforeSnap");
let afterSnap = document.getElementById("afterSnap");
let snapName = document.getElementById("snapName");
let snapDescription = document.getElementById("snapDescription");
let startCapture = function () {
    beforeSnap.classList.remove("d-none");
    beforeSnap.classList.add("d-flex", "flex-column", "align-items-center");
    afterSnap.classList.remove("d-flex", "flex-column", "align-items-center");
    afterSnap.classList.add("d-none");
    if (!("mediaDevices" in navigator)) {
        // fallback to file upload button, ili sl.
        // vidjet i custom API-je: webkitGetUserMedia i mozGetUserMedia
    } else {
        navigator.mediaDevices
            .getUserMedia({ video: true, audio: false })
            .then((stream) => {
                player.srcObject = stream;
            })
            .catch((err) => {
                alert("Media stream not working");
                console.log(err);
            });
    }
};
startCapture();
let stopCapture = function () {
    afterSnap.classList.remove("d-none");
    afterSnap.classList.add("d-flex", "flex-column", "align-items-center");
    beforeSnap.classList.remove("d-flex", "flex-column", "align-items-center");
    beforeSnap.classList.add("d-none");
    player.srcObject.getVideoTracks().forEach(function (track) {
        track.stop();
    });
};
document.getElementById("btnSnap").addEventListener("click", function (event) {
    canvas.width = player.getBoundingClientRect().width;
    canvas.height = player.getBoundingClientRect().height;
    canvas
        .getContext("2d")
        .drawImage(player, 0, 0, canvas.width, canvas.height);
    stopCapture();
});
document
    .getElementById("btnUpload")
    .addEventListener("click", function (event) {
        event.preventDefault();
        if (!snapName.value.trim() || !snapDescription.value.trim()) {
            alert("Book name and description!");
            return false;
        }
        if ("serviceWorker" in navigator && "SyncManager" in window) {
            let url = canvas.toDataURL();
            fetch(url)
                .then((res) => res.blob())
                .then((blob) => {
                    let ts = new Date().toISOString();
                    let id = ts + 
                    "title=" + snapName.value.replace(/\s/g, "_") + 
                    "&desc=" + snapDescription.value.replace(/\s/g, "_"); // ws->_
                    set(id, {
                        id,
                        ts,
                        title: snapName.value,
                        image: blob,
                        description: snapDescription.value,
                    });
                    return navigator.serviceWorker.ready;
                })
                .then((swRegistration) => {
                    return swRegistration.sync.register("sync-snaps");
                })
                .then(() => {
                    console.log("Queued for sync");
                    startCapture();
                })
                .catch((error) => {
                    alert(error);
                    console.log(error);
                });
        } else {
            // fallback
            // pokusati poslati, pa ako ima mreze onda dobro...
            alert("TODO - vaš preglednik ne podržava bckg sync...");
        }
    });
