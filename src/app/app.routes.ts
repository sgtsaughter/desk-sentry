import { Routes } from '@angular/router';
import { PoseDetectionComponent } from './pose-detection/pose-detection.component';

export const routes: Routes = [
  { path: '', component: PoseDetectionComponent },
  { path: '**', redirectTo: '' }
];
