import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  MatDialogRef, 
  MAT_DIALOG_DATA, 
  MatDialogModule 
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { FormsModule } from '@angular/forms';
import { 
  CdkDragDrop, 
  DragDropModule, 
  moveItemInArray 
} from '@angular/cdk/drag-drop';
import { ColorPickerDirective } from 'ngx-color-picker';
import { getLayerColorByName } from './layer-colors.enum';

export interface LayerConfigData {
  availableLayers: string[];
  selected3DLayers: number[];
  layerOpacities?: Map<number, number>; // opacity per layer index (0-1)
  layerColors?: Map<number, string>; // color per layer index (hex format)
}

export interface LayerItem {
  index: number;
  name: string;
  selected: boolean;
  opacity: number; // 0-1 range
  color: string; // hex color
}

export interface LayerConfigResult {
  selectedIndices: number[];
  opacities: Map<number, number>;
  colors: Map<number, string>;
}

@Component({
  selector: 'app-layer-config-dialog',
  templateUrl: './layer-config-dialog.component.html',
  styleUrls: ['./layer-config-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatSliderModule,
    FormsModule,
    DragDropModule,
    ColorPickerDirective
  ]
})
export class LayerConfigDialogComponent {
  layers: LayerItem[] = [];

  constructor(
    public dialogRef: MatDialogRef<LayerConfigDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: LayerConfigData
  ) {
    // Initialize layers list based on original order or previous selection order
    // First, add the selected lists in their specific order
    const selectedIndices = new Set(data.selected3DLayers);
    const opacities = data.layerOpacities || new Map();
    const colors = data.layerColors || new Map();
    
    // Add selected layers first in their defined order
    data.selected3DLayers.forEach(index => {
      const name = data.availableLayers[index];
      this.layers.push({
        index: index,
        name: name,
        selected: true,
        opacity: opacities.get(index) ?? 1.0,
        color: colors.get(index) ?? getLayerColorByName(name)
      });
    });

    // Then add the rest of the unselected layers
    data.availableLayers.forEach((name, index) => {
      if (!selectedIndices.has(index)) {
        this.layers.push({
          index: index,
          name: name,
          selected: false,
          opacity: opacities.get(index) ?? 1.0,
          color: colors.get(index) ?? getLayerColorByName(name)
        });
      }
    });

  }

  drop(event: CdkDragDrop<LayerItem[]>) {
    moveItemInArray(this.layers, event.previousIndex, event.currentIndex);
  }

  getLayerColor(name: string): string {
    return getLayerColorByName(name);
  }

  apply() {
    // Return selected layer indices, their opacity values, and colors
    const selectedLayers = this.layers.filter(layer => layer.selected);
    const selectedIndices = selectedLayers.map(layer => layer.index);
    
    const opacities = new Map<number, number>();
    const colors = new Map<number, string>();
    selectedLayers.forEach(layer => {
      opacities.set(layer.index, layer.opacity);
      colors.set(layer.index, layer.color);
    });
      
    this.dialogRef.close({ selectedIndices, opacities, colors });
  }

  cancel() {
    this.dialogRef.close();
  }
}
