import { Injectable } from '@angular/core';

// MediaPipe Pose landmark indices
// Full list: https://google.github.io/mediapipe/solutions/pose.html
const LANDMARKS = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_EAR: 7,
  RIGHT_EAR: 8
};

export interface PostureAnalysis {
  score: number; // 0-100, higher is better
  status: 'good' | 'fair' | 'poor';
  message: string;
  posture: 'sitting' | 'standing';
  forwardHeadAngle?: number; // For sitting posture
  shoulderHipAngle?: number; // For standing posture
  metrics: {
    earShoulderAlignment?: number;
    noseShoulderAlignment?: number;
    hipAlignment?: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class PostureService {

  /**
   * Analyzes posture from MediaPipe landmarks
   * Automatically detects sitting vs standing based on hip visibility
   * @param landmarks Array of 33 pose landmarks with x, y, z coordinates
   * @returns PostureAnalysis object with score and feedback
   */
  analyzePosture(landmarks: any[]): PostureAnalysis | null {
    if (!landmarks || landmarks.length < 33) {
      return null;
    }

    // Get key landmarks
    const leftShoulder = landmarks[LANDMARKS.LEFT_SHOULDER];
    const rightShoulder = landmarks[LANDMARKS.RIGHT_SHOULDER];
    const leftHip = landmarks[LANDMARKS.LEFT_HIP];
    const rightHip = landmarks[LANDMARKS.RIGHT_HIP];
    const leftEar = landmarks[LANDMARKS.LEFT_EAR];
    const rightEar = landmarks[LANDMARKS.RIGHT_EAR];
    const nose = landmarks[LANDMARKS.NOSE];

    // Check if shoulders and ears are visible (required for both sitting and standing)
    if (!this.areLandmarksVisible([leftShoulder, rightShoulder, leftEar, rightEar, nose])) {
      return null;
    }

    // Detect if user is sitting or standing based on hip visibility
    const hipsVisible = this.areLandmarksVisible([leftHip, rightHip]);

    if (hipsVisible) {
      // Standing posture - use shoulder-hip alignment
      return this.analyzeStandingPosture(landmarks);
    } else {
      // Sitting posture - use ear-shoulder-nose alignment
      return this.analyzeSittingPosture(landmarks);
    }
  }

  /**
   * Analyzes sitting posture using ear-shoulder-nose alignment
   * Focuses on forward head posture and shoulder position
   */
  private analyzeSittingPosture(landmarks: any[]): PostureAnalysis {
    const leftShoulder = landmarks[LANDMARKS.LEFT_SHOULDER];
    const rightShoulder = landmarks[LANDMARKS.RIGHT_SHOULDER];
    const leftEar = landmarks[LANDMARKS.LEFT_EAR];
    const rightEar = landmarks[LANDMARKS.RIGHT_EAR];
    const nose = landmarks[LANDMARKS.NOSE];

    // Calculate midpoints
    const shoulderMidpoint = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
      z: (leftShoulder.z + rightShoulder.z) / 2
    };

    const earMidpoint = {
      x: (leftEar.x + rightEar.x) / 2,
      y: (leftEar.y + rightEar.y) / 2,
      z: (leftEar.z + rightEar.z) / 2
    };

    // Forward head posture check
    // In good posture, ear should be roughly above shoulder (same X coordinate)
    // Forward head = ear is in front of shoulder (larger X value)
    const forwardHeadDistance = earMidpoint.x - shoulderMidpoint.x;

    // Neck angle - ear should be relatively above shoulder, not forward
    // Using Z-depth: ear behind shoulder (positive Z) is better
    const earShoulderDepth = earMidpoint.z - shoulderMidpoint.z;

    // Calculate nose forward lean
    const noseForwardLean = nose.x - shoulderMidpoint.x;

    // Score calculation for sitting posture
    let score = 100;

    // Penalize forward head posture
    // Good: ear directly above shoulder (forwardHeadDistance near 0)
    // Bad: ear far forward from shoulder
    if (Math.abs(forwardHeadDistance) > 0.05) {
      const forwardPenalty = Math.abs(forwardHeadDistance) * 300;
      score -= forwardPenalty;
    }

    // Penalize if head is too far forward in depth
    if (earShoulderDepth < -0.02) {
      const depthPenalty = Math.abs(earShoulderDepth) * 200;
      score -= depthPenalty;
    }

    // Penalize nose being too far forward (looking down at screen too much)
    if (noseForwardLean > 0.08) {
      const nosePenalty = (noseForwardLean - 0.08) * 150;
      score -= nosePenalty;
    }

    // Check shoulder symmetry (both shoulders should be level)
    const shoulderImbalance = Math.abs(leftShoulder.y - rightShoulder.y);
    if (shoulderImbalance > 0.05) {
      score -= shoulderImbalance * 100;
    }

    // Clamp to 0-100
    score = Math.round(Math.min(100, Math.max(0, score)));

    // Determine status and message
    let status: 'good' | 'fair' | 'poor';
    let message: string;

    if (score >= 75) {
      status = 'good';
      message = '✓ Excellent sitting posture!';
    } else if (score >= 50) {
      status = 'fair';
      message = '⚠ Head too far forward';
    } else {
      status = 'poor';
      message = '✗ Slouching - sit up straight!';
    }

    return {
      score,
      status,
      message,
      posture: 'sitting',
      forwardHeadAngle: Math.atan2(forwardHeadDistance, Math.abs(earMidpoint.y - shoulderMidpoint.y)) * (180 / Math.PI),
      metrics: {
        earShoulderAlignment: forwardHeadDistance,
        noseShoulderAlignment: noseForwardLean
      }
    };
  }

  /**
   * Analyzes standing posture using shoulder-hip alignment
   * Original algorithm for when full body is visible
   */
  private analyzeStandingPosture(landmarks: any[]): PostureAnalysis {
    const leftShoulder = landmarks[LANDMARKS.LEFT_SHOULDER];
    const rightShoulder = landmarks[LANDMARKS.RIGHT_SHOULDER];
    const leftHip = landmarks[LANDMARKS.LEFT_HIP];
    const rightHip = landmarks[LANDMARKS.RIGHT_HIP];
    const nose = landmarks[LANDMARKS.NOSE];

    // Calculate midpoints
    const shoulderMidpoint = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
      z: (leftShoulder.z + rightShoulder.z) / 2
    };

    const hipMidpoint = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2,
      z: (leftHip.z + rightHip.z) / 2
    };

    // Calculate forward lean (using Z-axis depth)
    // Positive Z means shoulder is behind hip (good)
    // Negative Z means shoulder is in front of hip (slouching)
    const forwardLean = shoulderMidpoint.z - hipMidpoint.z;

    // Calculate vertical alignment (X-axis)
    // Should be close to 0 for good posture
    const horizontalAlignment = Math.abs(shoulderMidpoint.x - hipMidpoint.x);

    // Calculate angle between shoulder-hip line and vertical
    const deltaX = shoulderMidpoint.x - hipMidpoint.x;
    const deltaY = shoulderMidpoint.y - hipMidpoint.y;
    const shoulderHipAngle = Math.abs(Math.atan2(deltaX, deltaY) * (180 / Math.PI));

    // Calculate alignment score (0-100)
    // Good posture: shoulders slightly behind or aligned with hips
    // Forward lean should be > -0.05 (not too far forward)
    let alignment = 0;

    if (forwardLean > 0.02) {
      // Shoulders behind hips - very good
      alignment = 100;
    } else if (forwardLean > -0.05) {
      // Slight forward lean - acceptable
      alignment = 80 - (Math.abs(forwardLean) * 400);
    } else {
      // Significant slouch
      alignment = Math.max(0, 60 - (Math.abs(forwardLean) * 600));
    }

    // Factor in horizontal alignment
    const horizontalPenalty = horizontalAlignment * 200;
    alignment = Math.max(0, alignment - horizontalPenalty);

    // Clamp to 0-100
    const score = Math.round(Math.min(100, Math.max(0, alignment)));

    // Determine status and message
    let status: 'good' | 'fair' | 'poor';
    let message: string;

    if (score >= 75) {
      status = 'good';
      message = '✓ Excellent posture!';
    } else if (score >= 50) {
      status = 'fair';
      message = '⚠ Sit up straighter';
    } else {
      status = 'poor';
      message = '✗ Slouching detected!';
    }

    return {
      score,
      status,
      message,
      posture: 'standing',
      shoulderHipAngle,
      metrics: {
        hipAlignment: forwardLean
      }
    };
  }

  /**
   * Checks if landmarks are visible (have sufficient confidence)
   */
  private areLandmarksVisible(landmarks: any[]): boolean {
    return landmarks.every(landmark =>
      landmark && landmark.visibility !== undefined && landmark.visibility > 0.5
    );
  }

  /**
   * Calculates distance between two 3D points
   */
  private calculate3DDistance(p1: any, p2: any): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = p1.z - p2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}
