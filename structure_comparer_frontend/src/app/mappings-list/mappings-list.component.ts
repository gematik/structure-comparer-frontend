import { Component, OnInit } from '@angular/core';
import { MappingsService } from '../mappings.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-mappings-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './mappings-list.component.html',
  styleUrls: ['./mappings-list.component.css']
})
export class MappingsListComponent implements OnInit {
  mappings: any[] = [];

  constructor(private mappingsService: MappingsService) { }

  ngOnInit(): void {
    this.mappingsService.getMappings().subscribe(data => {
      this.mappings = data.mappings;
    });
  }
}