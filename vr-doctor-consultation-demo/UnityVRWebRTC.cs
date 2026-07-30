using System.Collections;
using UnityEngine;
using Unity.WebRTC;

/// <summary>
/// Unity C# 2-Way WebRTC Controller for Meta Quest 3 / Meta Quest 3S & PC VR
/// Supports Case 1 (Doctor Web App <-> VR) and Case 2 (VR <-> VR).
/// Requires 'com.unity.webrtc' installed via Unity Package Manager.
/// </summary>
public class UnityVRWebRTC : MonoBehaviour
{
    [Header("VR Display Settings")]
    [Tooltip("Drag the Material of your floating 3D Quad/Screen here")]
    public Material doctorDisplayMaterial;
    
    [Header("VR View Streaming Settings")]
    [Tooltip("Camera in Unity that captures the patient VR perspective")]
    public Camera vrStreamCamera;
    public RenderTexture vrRenderTexture;

    [Header("Session Room Key")]
    public string roomKey = "DOC-8921"; // Doctor generated key (Valid until 12:00 AM IST)

    private RTCPeerConnection peerConnection;
    private RTCDataChannel dataChannel;
    private VideoStreamTrack localVideoTrack;

    void Start()
    {
        // 1. Initialize WebRTC Subsystem
        WebRTC.Initialize();

        // 2. Configure STUN Server
        RTCConfiguration config = new RTCConfiguration
        {
            iceServers = new[]
            {
                new RTCIceServer { urls = new[] { "stun:stun.l.google.com:19302" } }
            }
        };

        peerConnection = new RTCPeerConnection(ref config);

        // 3. Setup Incoming Video Track Listener (Doctor Stream -> VR Material)
        peerConnection.OnTrack = OnTrackReceived;

        // 4. Setup DataChannel Listener for Doctor Session Controllers (START_SESSION / END_SESSION)
        peerConnection.OnDataChannel = channel =>
        {
            dataChannel = channel;
            dataChannel.OnMessage = bytes =>
            {
                string message = System.Text.Encoding.UTF8.GetString(bytes);
                Debug.Log($"[VR Session Signal]: {message}");

                if (message == "START_SESSION")
                {
                    // Show 3D Display Screen in VR
                    if (doctorDisplayMaterial != null) doctorDisplayMaterial.color = Color.white;
                }
                else if (message == "END_SESSION")
                {
                    // Hide Screen / Reset Texture for next patient
                    if (doctorDisplayMaterial != null) doctorDisplayMaterial.mainTexture = null;
                }
            };
        };

        // 5. Start VR Camera Video Capture & Stream to Doctor
        if (vrStreamCamera != null && vrRenderTexture != null)
        {
            localVideoTrack = vrStreamCamera.CaptureStreamTrack(1920, 1080, 30);
            peerConnection.AddTrack(localVideoTrack);
        }
    }

    private void OnTrackReceived(RTCTrackEvent evt)
    {
        if (evt.Track is VideoStreamTrack videoTrack)
        {
            Debug.Log("[VR WebRTC] Doctor Video Stream Received!");

            // Render live WebRTC video onto Unity Material / RenderTexture
            videoTrack.OnVideoReceived += tex =>
            {
                if (doctorDisplayMaterial != null)
                {
                    doctorDisplayMaterial.mainTexture = tex;
                }
            };
        }
    }

    void OnDestroy()
    {
        localVideoTrack?.Dispose();
        peerConnection?.Close();
        WebRTC.Dispose();
    }
}
