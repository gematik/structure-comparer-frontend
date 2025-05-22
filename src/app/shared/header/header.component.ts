import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { BreadcrumbService } from '../../breadcrumb.service';
import { filter } from 'rxjs';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule,
    CommonModule
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  breadcrumbs: any[] = [];

  constructor(private router: Router, private route: ActivatedRoute, private breadcrumbService: BreadcrumbService) {}

  ngOnInit(): void {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.breadcrumbs = this.breadcrumbService.getBreadcrumbs(this.route.root.snapshot);
        console.log("breadcrumbs", this.breadcrumbs);
      });
  }
}

