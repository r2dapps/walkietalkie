export class LocalWebRTCEngine {
  private myId: string;
  private bc: BroadcastChannel;
  private peerConnections: Record<string, RTCPeerConnection> = {};
  private localStream: MediaStream | null = null;
  private callbacks: Record<string, Function[]> = {
    open: [],
    call: [],
    connection: [],
    error: []
  };
  public destroyed: boolean = false;

  constructor(id: string, stream?: MediaStream) {
    this.myId = id;
    if (stream) this.localStream = stream;
    this.bc = new BroadcastChannel('aethertalk_local_signaling');
    
    this.bc.onmessage = (evt) => {
      if (this.destroyed) return;
      const data = evt.data;
      if (!data || data.target !== this.myId) return;

      if (data.type === 'offer') {
        this.handleOffer(data.sender, data.sdp);
      } else if (data.type === 'answer') {
        this.handleAnswer(data.sender, data.sdp);
      } else if (data.type === 'ice-candidate') {
        this.handleCandidate(data.sender, data.candidate);
      }
    };

    // Simulate async open
    setTimeout(() => {
      this.emit('open', this.myId);
    }, 100);
  }

  public on(event: string, callback: Function) {
    if (!this.callbacks[event]) this.callbacks[event] = [];
    this.callbacks[event].push(callback);
  }

  private emit(event: string, ...args: any[]) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(cb => cb(...args));
    }
  }

  private sendSignal(target: string, data: any) {
    if (this.destroyed) return;
    this.bc.postMessage({
      sender: this.myId,
      target,
      ...data
    });
  }

  private createPeerConnection(targetId: string, isInitiator: boolean) {
    if (this.peerConnections[targetId]) {
      return this.peerConnections[targetId];
    }
    
    // We can use generic STUN/TURN, but for local network, we actually don't need any ICE servers
    // Local host candidates will be generated automatically.
    const pc = new RTCPeerConnection({
      iceServers: [] 
    });

    this.peerConnections[targetId] = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal(targetId, { type: 'ice-candidate', candidate: event.candidate });
      }
    };

    return pc;
  }

  public connect(targetId: string, options?: any) {
    // Implement Mock DataConnection
    const pc = this.createPeerConnection(targetId, true);
    const dataChannel = pc.createDataChannel('data');
    
    const mockConn = new MockDataConnection(targetId, dataChannel);
    
    // Create offer
    pc.createOffer().then(offer => {
      return pc.setLocalDescription(offer);
    }).then(() => {
      this.sendSignal(targetId, { type: 'offer', sdp: pc.localDescription });
    });

    return mockConn;
  }

  public call(targetId: string, stream: MediaStream) {
    const pc = this.createPeerConnection(targetId, true);
    
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    const mockCall = new MockMediaConnection(targetId, pc, this);

    pc.createOffer().then(offer => {
      return pc.setLocalDescription(offer);
    }).then(() => {
      this.sendSignal(targetId, { type: 'offer', sdp: pc.localDescription });
    });

    return mockCall;
  }

  private async handleOffer(senderId: string, sdp: RTCSessionDescriptionInit) {
    const pc = this.createPeerConnection(senderId, false);
    
    pc.ondatachannel = (event) => {
      const mockConn = new MockDataConnection(senderId, event.channel);
      this.emit('connection', mockConn);
    };

    pc.ontrack = (event) => {
      const mockCall = new MockMediaConnection(senderId, pc, this);
      mockCall.remoteStream = event.streams[0];
      this.emit('call', mockCall);
    };

    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    this.sendSignal(senderId, { type: 'answer', sdp: pc.localDescription });
  }

  private async handleAnswer(senderId: string, sdp: RTCSessionDescriptionInit) {
    const pc = this.peerConnections[senderId];
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    }
  }

  private async handleCandidate(senderId: string, candidate: RTCIceCandidateInit) {
    const pc = this.peerConnections[senderId];
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn('Error adding ICE candidate', e);
      }
    }
  }

  public destroy() {
    this.destroyed = true;
    this.bc.close();
    Object.values(this.peerConnections).forEach(pc => pc.close());
    this.peerConnections = {};
  }
}

class MockDataConnection {
  public peer: string;
  private channel: RTCDataChannel;
  public open: boolean = false;
  private callbacks: Record<string, Function[]> = {
    open: [],
    data: [],
    close: [],
    error: []
  };

  constructor(peer: string, channel: RTCDataChannel) {
    this.peer = peer;
    this.channel = channel;

    this.channel.onopen = () => {
      this.open = true;
      this.emit('open');
    };
    
    this.channel.onmessage = (evt) => {
      let data = evt.data;
      try {
        data = JSON.parse(evt.data);
      } catch(e) {}
      this.emit('data', data);
    };

    this.channel.onclose = () => {
      this.open = false;
      this.emit('close');
    };

    this.channel.onerror = (err) => {
      this.emit('error', err);
    };
  }

  public on(event: string, callback: Function) {
    if (!this.callbacks[event]) this.callbacks[event] = [];
    this.callbacks[event].push(callback);
  }

  private emit(event: string, ...args: any[]) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(cb => cb(...args));
    }
  }

  public send(data: any) {
    if (this.open) {
      const msg = typeof data === 'string' ? data : JSON.stringify(data);
      this.channel.send(msg);
    }
  }

  public close() {
    this.channel.close();
  }
}

class MockMediaConnection {
  public peer: string;
  private pc: RTCPeerConnection;
  private engine: LocalWebRTCEngine;
  public remoteStream: MediaStream | null = null;
  private callbacks: Record<string, Function[]> = {
    stream: [],
    close: [],
    error: []
  };
  private answered: boolean = false;

  constructor(peer: string, pc: RTCPeerConnection, engine: LocalWebRTCEngine) {
    this.peer = peer;
    this.pc = pc;
    this.engine = engine;

    this.pc.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      if (this.answered) {
         this.emit('stream', this.remoteStream);
      }
    };

    this.pc.onconnectionstatechange = () => {
      if (this.pc.connectionState === 'disconnected' || this.pc.connectionState === 'failed' || this.pc.connectionState === 'closed') {
        this.emit('close');
      }
    };
  }

  public on(event: string, callback: Function) {
    if (!this.callbacks[event]) this.callbacks[event] = [];
    this.callbacks[event].push(callback);
  }

  private emit(event: string, ...args: any[]) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(cb => cb(...args));
    }
  }

  public answer(stream: MediaStream) {
    this.answered = true;
    if (this.remoteStream) {
      this.emit('stream', this.remoteStream);
    }
  }

  public close() {
    this.pc.close();
    this.emit('close');
  }
}
