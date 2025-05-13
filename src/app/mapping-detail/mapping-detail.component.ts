import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MappingsService } from '../mappings.service';

export interface IProfile {
  name: string;
  extra: string;
  action: string;
  remark: string;
  [key: string]: any;
}

@Component({
  selector: 'app-mapping-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule
  ],
  templateUrl: './mapping-detail.component.html',
  styleUrls: ['./mapping-detail.component.css'],
})

export class MappingDetailComponent implements OnInit {
  
  projectKey: string;
  mappingId: string;
  original: any;
  mapping: any;
  availableFields: any[] = [];
  classifications: any[] = [];
  editingIndex: number | null | undefined = null;
  hoverIndex: number | null | undefined = null;
  filtered: any;
  // Paginator
  totalLength: number = 0;
  pageSize: number = 200;
  pageIndex: number = 0;
  pageSizeOptions: number[] = [10, 50, 100, 200, 500];

  constructor(
    private route: ActivatedRoute,
    private mappingsService: MappingsService
    
  ) {this.projectKey = ""; this.mappingId = "";}

  ngOnInit(): void {
    this.projectKey = this.route.snapshot.paramMap.get('projectKey') || '';
    this.mappingId = this.route.snapshot.paramMap.get('mappingId') || '';
    if (this.projectKey && this.mappingId) {
      this.loadMapping(this.projectKey, this.mappingId);
      this.loadFields(this.projectKey, this.mappingId);
      this.loadActions();
    }
  }

  loadMapping(projectKey: string, mappingId: string) {
    this.mappingsService
      .getMapping(projectKey, mappingId)
      .pipe(
        catchError((err) => {
          console.error('Error loading mapping detail', err);
          return of({});
        })
      )
      .subscribe((mapping) => {
        console.log('mapping', mapping);
        this.totalLength = mapping.fields.length;
        this.original = mapping;
        this.mapping = this.original;
        this.filtered = {
          ...mapping,
          fields: mapping.fields.slice(0, this.pageSize),
        };
        
      });
      
  }

  loadFields(projectKey: string, mappingId: string) {
    this.mappingsService
      .getMappingFields(projectKey, mappingId)
      .pipe(
        catchError((err) => {
          console.error('Error loading fields', err);
          return of([]);
        })
      )
      .subscribe((fields) => (this.availableFields = fields.fields));
  }

  loadActions() {
    this.mappingsService.getActions().pipe(catchError((err) => {
      console.error('Error loading classifications', err);
      return of([]);
    })
    ).subscribe((data) => {
      console.log('actions', data);
      this.classifications = data.actions;
      console.log('classifications', this.classifications);
    });
  }

  getClassificationInstruction(action: string): string {
    const found = this.classifications.find(c => c.value === action);
    return found ? found.description : '';
  }


  isProfilePresent(fieldProfiles: { [key: string]: any }, profileName: string): boolean {
    
    return !!fieldProfiles[profileName];
  }

  handleTable = (e: any) => {
    const paginator = () => {
      this.pageSize = e.pageSize;
      this.pageIndex = e.pageIndex;
      this.filtered = {
        ...this.mapping,
        fields: this.mapping.fields.slice(
          this.pageSize * this.pageIndex,
          this.pageSize * (this.pageIndex + 1)
        ),
      };
    };

    const sorter = () => {
      const data = this.filtered.fields;
      if (!e.active || e.direction === '') {
        this.filtered = { ...this.filtered, fields: data };
        return;
      }
      const sortedData = data.sort((a: IProfile, b: IProfile) => {
        const isAsc = e.direction === 'asc';
        const otherCondition = (t: any) =>
          t['profiles'].find((profile: any) => profile.name === e.active)
            .present;

        switch (e.active) {
          case 'name':
          case 'remark':
            return compare(a[e.active], b[e.active], isAsc);
          case 'extra':
            return compare(
              a['classification'] + a['extra'],
              b['classification'] + b['extra'],
              isAsc
            );
          default:
            return compare(otherCondition(a), otherCondition(b), isAsc);
        }
      });

      this.filtered = {
        ...this.filtered,
        fields: sortedData,
      };
    };

    const filter = () => {
      const val = (e.target as HTMLInputElement).value.trim().toLowerCase();
      const filterCond = (record: IProfile) => {
        return (
          !val.length ||
          record.name.toLowerCase().indexOf(val) >= 0 ||
          record.remark.toLowerCase().indexOf(val) >= 0 ||
          record.action.toLowerCase().indexOf(val) >= 0 ||
          record.extra?.toLowerCase().indexOf(val) >= 0
        );
      };
      this.mapping = {
        ...this.mapping,
        fields: this.original.fields.filter(filterCond),
      };
      this.totalLength = this.mapping.fields.length;
      this.pageIndex = 0;
      this.filtered = {
        ...this.mapping,
        fields: this.mapping.fields.slice(
          this.pageSize * this.pageIndex,
          this.pageSize * (this.pageIndex + 1)
        ),
      };
    };

    return { paginator, sorter, filter };
  };

  handleEdit = (idx?: number) => {
    const startHover = () => {
      if (this.editingIndex === null) {
        this.hoverIndex = idx;
      }
    };

    const stopHover = () => {
      this.hoverIndex = null;
    };

    const startEdit = () => {
      this.editingIndex = idx;
    };

    const cancelEdit = () => {
      this.editingIndex = null;
    };

    return { startHover, stopHover, startEdit, cancelEdit };
  };

  getClassificationCssClass(action: string): string {
    const CSS_CLASS: { [key: string]: string } = {
      use: 'row-use',
      not_use: 'row-not-use',
      empty: 'row-empty',
      extension: 'row-extension',
      manual: 'row-manual',
      other: 'row-other',
      copy_from: 'row-copy-from',
      copy_to: 'row-copy-to',
      fixed: 'row-fixed',
      medication_service: 'row-medication-service',
    };
    return CSS_CLASS[action] || '';
  }

  // ToDo: Es ist die Frage, was hier im Body sein muss?! Das ist aktuell das einzige Problem. Die Dokue ist da nicht so aussagekräftig.
  confirmChanges(field: any) {
    console.log('Confirming changes for field:', field);
    let action: string;
    const updateData: any = {};
    switch (field.remark) {
      case 'copy_from':
        action = 'copy_from';
        updateData.target = field.targetField;
        break;
      case 'copy_to':
        action = 'copy_to';
        updateData.target = field.targetField;
        break;
      case 'fixed':
        action = 'fixed';
        updateData.fixed = field.fixedValue;
        break;
      case 'not_use':
        action = 'not_use';
        break;
      case 'use':
        action = 'use';
        break;
      case 'empty':
        action = 'empty';
        break;
      default:
        console.error('Unknown userClassification:', field.use);
        return;
    }

    console.log('Update Data:', updateData);

    this.mappingsService
      .updateMappingField(this.projectKey, this.mapping.id, field.name, action, updateData)
      .subscribe({
        next: () => {
          this.loadMapping(this.projectKey, this.mapping.id);
        },
        error: (err) => console.error('Failed to update field', err),
      });

    this.handleEdit().cancelEdit();
  }
}

const compare = (a: number | string, b: number | string, isAsc: boolean) => {
  return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
};
