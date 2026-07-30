using System.Collections;
using UnityEngine;
using Unity.WebRTC;

/// <summary>
/// Unity C# WebRTC Handler for Meta Quest 3 / Meta Quest 3S
/// Requires 'com.unity.webrtc' installed via Unity Package Manager.
/// </summary>
public class UnityVRWebRTC : MonoBehaviour
{
    [Header("VR 3D Display Material Slot")]
    [Tooltip("Drag the Material of your floating 3D Screen/Quad here")]
    public Material doctorDisplayMaterial;

    [Header("Clinic Session Settings")]
    public string roomId = "CLINIC-HYD-01";
    public string signalingServerUrl = "https://your-firebase-database.firebaseio.com";

    private RTCPeerConnection peerConnection;

    void Start()
    {
        // 1. Initialize WebRTC subsystem
        WebRTC.Initialize();

        // 2. Configure Free Google STUN Server
        RTCConfiguration config = new RTCConfiguration
        {
            iceServers = new[]
            {
                new RTCIceServer { urls = new[] { "stun:stun.l.google.com:19302" } }
            }
        };

        peerConnection = new RTCPeerConnection(ref config);

        // 3. Listen for incoming video track from Doctor Web App
        peerConnection.OnTrack = OnTrackReceived;

        // 4. Handle ICE Candidates
        peerConnection.OnIceCandidate = candidate =>
        {
            Debug.Log($"[VR WebRTC] Local ICE Candidate generated: {candidate.Candidate}");
            // Send candidate to Firebase signaling server under /telemedicine_rooms/roomId/candidates
        };
    }

    private void OnTrackReceived(RTCTrackEvent evt)
    {
        if (evt.Track is VideoStreamTrack videoTrack)
        {
            Debug.Log("[VR WebRTC] Doctor Live Video Track Received!");

            videoTrack.OnVideoReceived += tex =>
            {
                // Assign live WebRTC video texture directly to the 3D Quad Material in VR
                if (doctorDisplayMaterial != null)
                {
                    doctorDisplayMaterial.mainTexture = tex;
                }
            };
        }
    }

    void OnDestroy()
    {
        peerConnection?.Close();
        WebRTC.Dispose();
    }
}
