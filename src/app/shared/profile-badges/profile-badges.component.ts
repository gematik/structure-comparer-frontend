import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FieldProfile } from '../../models/mapping.model';
import { CardinalityHelper } from '../../mapping-detail/mapping-detail-helpers';

@Component({
  selector: 'app-profile-badges',
  standalone: true,
  imports: [CommonModule, MatTooltipModule],
  templateUrl: './profile-badges.component.html',
  styleUrl: './profile-badges.component.css'
})
export class ProfileBadgesComponent {
  @Input() profile?: FieldProfile | null;
  @Input() refTooltip?: string;
  @Input() showRefWarning: boolean = false;

  formatCardinality(minVal: unknown, maxVal: unknown): string {
    return CardinalityHelper.formatCardinality(minVal, maxVal);
  }

  getCardinalityStyle(minVal: unknown, maxVal: unknown): Record<string, string> {
    return CardinalityHelper.getCardinalityStyle(minVal, maxVal);
  }
}
