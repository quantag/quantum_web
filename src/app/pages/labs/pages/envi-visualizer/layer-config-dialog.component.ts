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
import { getLayerColorByName } from './layer-colors.enum';

export interface LayerConfigData {
  availableLayers: string[];
  selected3DLayers: number[];
  layerOpacities?: Map<number, number>; // opacity per layer index (0-1)
}

export interface LayerItem {
  index: number;
  name: string;
  selected: boolean;
  opacity: number; // 0-1 range
}

export interface LayerConfigResult {
  selectedIndices: number[];
  opacities: Map<number, number>;
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
    DragDropModule
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
    
    // Add selected layers first in their defined order
    data.selected3DLayers.forEach(index => {
      this.layers.push({
        index: index,
        name: data.availableLayers[index],
        selected: true,
        opacity: opacities.get(index) ?? 1.0
      });
    });

    // Then add the rest of the unselected layers
    data.availableLayers.forEach((name, index) => {
      if (!selectedIndices.has(index)) {
        this.layers.push({
          index: index,
          name: name,
          selected: false,
          opacity: opacities.get(index) ?? 1.0
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
    // Return selected layer indices and their opacity values
    const selectedLayers = this.layers.filter(layer => layer.selected);
    const selectedIndices = selectedLayers.map(layer => layer.index);
    
    const opacities = new Map<number, number>();
    selectedLayers.forEach(layer => {
      opacities.set(layer.index, layer.opacity);
    });
      
    this.dialogRef.close({ selectedIndices, opacities });
  }

  cancel() {
    this.dialogRef.close();
  }
}
