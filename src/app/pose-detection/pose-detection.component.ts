import { Component, ElementRef, OnDestroy, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Pose } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { POSE_CONNECTIONS } from '@mediapipe/pose';
import { PostureService, PostureAnalysis } from '../services/posture.service';

@Component({
  selector: 'app-pose-detection',
  templateUrl: './pose-detection.component.html',
  styleUrls: ['./pose-detection.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class PoseDetectionComponent implements OnInit, OnDestroy {
  // ViewChild decorators to access DOM elements
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement', { static: false }) canvasElement!: ElementRef<HTMLCanvasElement>;

  private pose!: Pose;
  private camera!: Camera;

  // Posture analysis
  currentPosture: PostureAnalysis | null = null;
  isAnalyzing = false;

  // Notification throttling
  private lastNotificationTime = 0;
  private notificationCooldown = 60000; // 1 minute between notifications
  private lastPostureStatus: 'good' | 'fair' | 'poor' | null = null;

  constructor(
    private postureService: PostureService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log('PoseDetection component initialized');
  }

  ngAfterViewInit(): void {
    // Initialize after view is ready (video and canvas elements exist)
    this.initializePoseDetection();
  }

  ngOnDestroy(): void {
    // Cleanup: stop camera and close pose detection
    if (this.camera) {
      this.camera.stop();
    }
    if (this.pose) {
      this.pose.close();
    }
  }

  private initializePoseDetection(): void {
    // Initialize MediaPipe Pose
    this.pose = new Pose({
      locateFile: (file) => {
        // Load MediaPipe model files from CDN
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      }
    });

    // Configure pose detection settings
    this.pose.setOptions({
      modelComplexity: 1, // 0, 1, or 2 (higher = more accurate but slower)
      smoothLandmarks: true, // Smooth landmarks across frames
      enableSegmentation: false, // Don't need background segmentation
      smoothSegmentation: false,
      minDetectionConfidence: 0.5, // Confidence threshold for initial detection
      minTrackingConfidence: 0.5 // Confidence threshold for tracking
    });

    // Set up the callback for when pose results are ready
    this.pose.onResults((results) => this.onPoseResults(results));

    // Initialize camera and connect to pose detection
    const videoElement = this.videoElement.nativeElement;
    this.camera = new Camera(videoElement, {
      onFrame: async () => {
        // Send each video frame to pose detection
        await this.pose.send({ image: videoElement });
      },
      width: 1280,
      height: 720
    });

    // Start the camera
    this.camera.start();
  }

  private onPoseResults(results: any): void {
    // This is called every frame with pose detection results
    const canvasElement = this.canvasElement.nativeElement;
    const canvasCtx = canvasElement.getContext('2d')!;

    // Clear canvas and draw video frame
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    // If pose landmarks were detected, draw them and analyze posture
    if (results.poseLandmarks) {
      // Analyze posture from landmarks
      this.currentPosture = this.postureService.analyzePosture(results.poseLandmarks);
      this.isAnalyzing = true;

      // Check if posture improved - reset notification cooldown
      if (this.currentPosture) {
        if (this.lastPostureStatus === 'poor' && this.currentPosture.status !== 'poor') {
          // Posture improved from poor to fair/good - reset cooldown
          this.lastNotificationTime = 0;
          console.log('Posture improved - notification cooldown reset');
        }
        
        // Update last status
        this.lastPostureStatus = this.currentPosture.status;

        // Check if we should send a notification
        if (this.currentPosture.status === 'poor') {
          this.checkAndSendNotification(this.currentPosture);
        }
      }

      // Choose color based on posture quality
      let skeletonColor = '#00FF00'; // Green for good posture
      if (this.currentPosture) {
        if (this.currentPosture.status === 'poor') {
          skeletonColor = '#FF0000'; // Red for poor posture
        } else if (this.currentPosture.status === 'fair') {
          skeletonColor = '#FFA500'; // Orange for fair posture
        }
      }

      // Draw the skeleton connections (lines between joints)
      drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
        color: skeletonColor,
        lineWidth: 4
      });

      // Draw the landmark points (dots at each joint)
      drawLandmarks(canvasCtx, results.poseLandmarks, {
        color: skeletonColor,
        lineWidth: 2,
        radius: 6
      });
    } else {
      this.isAnalyzing = false;
      this.currentPosture = null;
    }

    canvasCtx.restore();

    // Trigger Angular change detection
    this.cdr.detectChanges();
  }

  /**
   * Check if we should send a notification and send it
   * Implements cooldown to avoid notification spam
   */
  private checkAndSendNotification(posture: PostureAnalysis): void {
    const now = Date.now();

    // Check if enough time has passed since last notification
    if (now - this.lastNotificationTime < this.notificationCooldown) {
      return; // Still in cooldown period
    }

    // Check if Electron API is available (we're in Electron, not browser)
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      (window as any).electronAPI.sendNotification({
        title: 'Desk Sentry Alert',
        body: `${posture.message} (Score: ${posture.score})`,
        urgency: 'normal'
      });

      this.lastNotificationTime = now;
      console.log('Notification sent: Poor posture detected');
    } else {
      // Fallback for browser/dev mode - use browser notifications
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Desk Sentry Alert', {
          body: posture.message,
          icon: '/assets/tray-icon-posture.png'
        });
        this.lastNotificationTime = now;
      }
    }
  }
}
