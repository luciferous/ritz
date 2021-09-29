"use strict";
async function newPeer(hangup, media, remote) {
    if (remote != null && remote.type != "offer") {
        throw new Error(`invalid remote: ${JSON.stringify(remote)}`);
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    const pc = new RTCPeerConnection;
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    hangup.onclick = e => {
        pc.close();
        stream.getTracks().forEach(track => track.stop());
        if (media.srcObject && 'getTracks' in media.srcObject) {
            media.srcObject.getTracks().forEach(track => track.stop());
        }
    };
    pc.ontrack = e => {
        if (e.streams.length < 1) {
            console.error("empty track:", e);
            return;
        }
        media.srcObject = e.streams[0];
    };
    if (remote) {
        await pc.setRemoteDescription(remote);
    }
    return new Promise(async (ok, fail) => {
        pc.onicegatheringstatechange = e => {
            if (pc.iceGatheringState != "complete")
                return;
            if (pc.localDescription != null)
                ok(pc);
            else
                fail(new Error("pc.localDescription is null"));
        };
        const desc = remote
            ? await pc.createAnswer({ offerToReceiveAudio: true })
            : await pc.createOffer({ offerToReceiveAudio: true });
        await pc.setLocalDescription(desc);
    });
}
window.go = async function (remote) {
    const textarea = document.getElementById("peer-1")?.querySelector("textarea");
    const hangup = document.getElementById("peer-1")?.querySelector("button");
    const media = document.getElementById("peer-1")?.querySelector("video");
    if (hangup == null) {
        throw new Error("missing hangup button");
    }
    if (media == null) {
        throw new Error("missing video element");
    }
    const local = remote
        ? await newPeer(hangup, media, new RTCSessionDescription(JSON.parse(remote)))
        : await newPeer(hangup, media);
    if (textarea) {
        textarea.value = JSON.stringify(local.localDescription);
    }
    return local;
};
