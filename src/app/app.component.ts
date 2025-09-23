/**
 * Root component of the Structure Comparer application
 * Contains the main layout with header and router outlet for page content
 */
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './shared/header/header.component';
import * as tslib from 'tslib'; 

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  // Application title displayed in the browser tab
  title = 'structure_comparer';
}
