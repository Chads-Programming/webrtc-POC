import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

interface Payload {
  target: string;
  caller: string;
  sdp: RTCSessionDescription;
}
export function RTCView() {
  const [offer, setOffer] = useState("");
  const [remoteOffer, setRemoteOffer] = useState("");
  const userVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const userStream = useRef<MediaStream>();
  const socketRef = useRef<Socket>();
  const otherUser = useRef<string>();
  const peerRef = useRef<RTCPeerConnection>();

  const callUser = (userID: string) => {
    peerRef.current = createPeer(userID);
    userStream.current!.getTracks().forEach((track) => {
      peerRef.current?.addTrack(track, userStream.current!);
    });
  };

  const createPeer = (userID?: string) => {
    const peer = new RTCPeerConnection({
      iceServers: [
        {
          urls: "stun:stun.relay.metered.ca:80",
        },
        {
          urls: "turn:global.relay.metered.ca:80",
          username: "88e0578f2fee3d65cb9a0a53",
          credential: "zYuTMMxswJ6PNIHI",
        },
        {
          urls: "turn:global.relay.metered.ca:80?transport=tcp",
          username: "88e0578f2fee3d65cb9a0a53",
          credential: "zYuTMMxswJ6PNIHI",
        },
        {
          urls: "turn:global.relay.metered.ca:443",
          username: "88e0578f2fee3d65cb9a0a53",
          credential: "zYuTMMxswJ6PNIHI",
        },
        {
          urls: "turns:global.relay.metered.ca:443?transport=tcp",
          username: "88e0578f2fee3d65cb9a0a53",
          credential: "zYuTMMxswJ6PNIHI",
        },
      ],
    });
    peer.onicecandidate = handleIceCandidate;
    peer.ontrack = handleTrackEvent;
    peer.onnegotiationneeded = () => handleNegotiationNeeded(userID ?? "");

    return peer;
  };

  function handleIceCandidate(ev: RTCPeerConnectionIceEvent) {
    if (ev.candidate) {
      const payload = {
        target: otherUser.current,
        candidate: ev.candidate,
      };
      console.log("ICE_CANDIDATE", payload);
      socketRef.current?.emit("ICE_CANDIDATE", payload);
    }
  }

  function handleReceiveCall(incoming: Payload) {
    peerRef.current = createPeer();
    const description = new RTCSessionDescription(incoming.sdp);
    peerRef.current
      .setRemoteDescription(description)
      .then(() => {
        userStream.current?.getTracks().forEach((track) => {
          peerRef.current?.addTrack(track, userStream.current!);
        });
      })
      .then(() => {
        return peerRef.current?.createAnswer();
      })
      .then((answer) => {
        return peerRef.current?.setLocalDescription(answer);
      })
      .then(() => {
        const payload = {
          target: incoming.caller,
          caller: socketRef.current?.id,
          sdp: peerRef.current?.localDescription,
        };
        setOffer(peerRef.current?.localDescription?.sdp ?? "");
        socketRef.current?.emit("ANSWER", payload);
      });
  }

  function handleNegotiationNeeded(userID: string) {
    peerRef
      .current!.createOffer()
      .then((offer) => {
        return peerRef.current?.setLocalDescription(offer);
      })
      .then(() => {
        const payload = {
          target: userID,
          caller: socketRef.current?.id,
          sdp: peerRef.current?.localDescription,
        };
        socketRef.current?.emit("OFFER", payload);
      })
      .catch((error) => console.log("handleNegotiationNeeded_ERROR", error));
  }

  function handleAnswer(incoming: Payload) {
    const description = new RTCSessionDescription(incoming.sdp);
    setRemoteOffer(incoming.sdp.sdp);
    peerRef.current?.setRemoteDescription(description);
  }

  function handleNewICECandidateMsg(incoming: RTCIceCandidateInit) {
    const candidate = new RTCIceCandidate(incoming);

    peerRef.current?.addIceCandidate(candidate).catch((e) => console.log(e));
  }

  function handleTrackEvent(e: RTCTrackEvent) {
    console.log("TRACK_EVENT");
    remoteVideo.current!.srcObject = e.streams[0];
  }

  useEffect(() => {
    if (userVideo.current) {
      navigator.mediaDevices
        .getUserMedia({ audio: true, video: true })
        .then((media) => {
          userVideo.current!.srcObject = media;
          userStream.current = media;
          socketRef.current = io("/").connect();
          socketRef.current.emit("JOIN_ROOM", "room-1");

          socketRef.current.on("OTHER_USER", (userID: string) => {
            console.log("OTHER_USER", userID);
            otherUser.current = userID;
            callUser(userID);
          });
          socketRef.current.on("USER_JOINED", (userID: string) => {
            console.log("USER_JOINED", userID);
            otherUser.current = userID;
          });
          socketRef.current.on("OFFER", handleReceiveCall);
          socketRef.current.on("ANSWER", handleAnswer);
          socketRef.current.on("ICE_CANDIDATE", handleNewICECandidateMsg);
        });
    }
    return () => {
      socketRef.current?.disconnect();
      peerRef.current?.close();
    };
  }, []);

  return (
    <div>
      <video autoPlay ref={userVideo} />
      <video autoPlay ref={remoteVideo} />
      <div>
        <p>Offer</p>
        <p style={{ fontSize: 6 }}>{offer}</p>
      </div>
      <div>
        <p>Incoming</p>
        <p style={{ fontSize: 6 }}>{remoteOffer}</p>
      </div>
    </div>
  );
}
