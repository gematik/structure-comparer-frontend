/**
 * Main entry point for the Angular application
 * Bootstraps the application with necessary providers and configuration
 */
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { importProvidersFrom } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

// Bootstrap the standalone Angular application
bootstrapApplication(AppComponent, {
  providers: [
    // Configure routing with defined routes
    provideRouter(routes),
    // Configure HTTP client with interceptor support
    provideHttpClient(withInterceptorsFromDi()),
    // Enable Angular animations
    importProvidersFrom(BrowserAnimationsModule)
  ]
}).catch(err => console.error(err));