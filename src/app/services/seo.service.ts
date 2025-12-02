import { Injectable } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';

export interface SeoData {
  title: string;
  description: string;
  keywords: string;
}

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  constructor(
    private titleService: Title,
    private metaService: Meta
  ) {}

  updateSeoTags(seoData: SeoData) {
    // Update title
    this.titleService.setTitle(seoData.title);
    
    // Update description
    this.metaService.updateTag({ 
      name: 'description', 
      content: seoData.description 
    });
    
    // Update keywords
    this.metaService.updateTag({ 
      name: 'keywords', 
      content: seoData.keywords 
    });
  }

  // Predefined SEO data for each lab tool
  private seoData: { [key: string]: SeoData } = {
    'labs': {
      title: 'Quantum Labs - Comprehensive Quantum Computing Development Tools',
      description: 'Access a complete suite of quantum computing development tools including 3D molecular visualization, QIR compiler, quantum code editor, circuit visualization, and data conversion utilities for quantum algorithm development.',
      keywords: 'quantum labs, quantum tools, quantum development, quantum computing tools, quantum IDE, quantum visualization, quantum algorithms, quantum programming, quantum debugging, quantum simulators'
    },
    'xyz': {
      title: 'XYZ Molecular Viewer - 3D Molecular Visualization Tool',
      description: 'Interactive 3D molecular structure visualization tool for XYZ files. Explore molecular geometry, atomic bonds, and chemical structures with real-time rendering, rotation controls, and detailed molecular analysis capabilities.',
      keywords: 'XYZ viewer, molecular visualization, 3D molecules, molecular structure, chemical visualization, atomic bonds, molecular geometry, chemistry tools, molecular modeling, scientific visualization, Three.js molecules'
    },
    'qir': {
      title: 'OpenQASM to QIR Converter',
      description: 'Convert OpenQASM code to QIR',
      keywords: 'QIR viewer, quantum intermediate representation, QIR compiler, quantum debugging, quantum code analysis, quantum programming, QIR standard, quantum development tools, quantum optimization, quantum syntax'
    },
    'qbin': {
      title: 'OpenQASM to QBIN Converter',
      description: 'Convert OpenQASM quantum code to QBIN binary format with hex and binary representation support. Professional quantum circuit compilation tool.',
      keywords: 'binary openqasm, OpenQASM to QBIN, QASM converter, QBIN encoder, quantum binary format, quantum compilation, QBIN generator, hex representation, quantum circuit binary, QASM to binary, quantum development tools'
    },
    'qic': {
      title: 'Quantum Image Compression',
      description: 'Compress images using quantum algorithms',
      keywords: 'quantum calculator, quantum information, quantum computing calculator, quantum states, quantum gates, quantum measurements, entanglement, quantum algorithms, quantum math, qubit calculations'
    },
    'qedit': {
      title: 'Quantum Code Editor',
      description: 'Professional quantum code editor with advanced syntax highlighting, auto-completion, error detection, and multi-language support for QASM, Qiskit, Cirq, and other quantum programming languages.',
      keywords: 'quantum editor, quantum code editor, QASM editor, quantum programming, quantum IDE, syntax highlighting, quantum development, code completion, quantum languages, quantum debugging'
    },
    'base64': {
      title: 'Base64 Converter',
      description: 'Base64 converter tool for encoding and decoding text and images to/from Base64 format. Support for PNG images, text files, and binary data with instant conversion and download capabilities for web development.',
      keywords: 'Base64 converter, Base64 encoder, Base64 decoder, text to Base64, image to Base64, PNG Base64, data encoding, file encoding, web development tools, API integration, binary to text, data conversion'
    },
    'compare-sql': {
      title: 'Compare SQL',
      description: 'Advanced SQL database schema comparison tool for analyzing differences between database structures. Compare tables, columns, indexes, and relationships with detailed diff reports and migration suggestions.',
      keywords: 'SQL comparison, database comparison, schema comparison, SQL diff, database schema, table comparison, SQL analysis, database migration, schema diff, SQL tools, database development'
    },
    '3d-circuit': {
      title: '3D Circuit Visualizer',
      description: 'Interactive 3D quantum circuit visualization tool for rendering quantum algorithms and gate sequences in three-dimensional space. Explore quantum circuits with real-time manipulation and detailed gate analysis.',
      keywords: '3D quantum circuits, quantum visualization, circuit visualization, quantum gates 3D, quantum algorithms visualization, interactive circuits, quantum development, circuit analysis, Three.js quantum'
    },
    'guppy-compiler': {
      title: 'Guppy Compiler',
      description: 'Advanced Guppy Python compiler for quantum computing. Analyze Python functions, extract compilable quantum operations, and generate optimized quantum circuits in binary, JSON, and string formats for quantum development.',
      keywords: 'Guppy compiler, Python quantum compiler, quantum Python, quantum circuit generation, Guppy language, quantum programming, Python to Guppy, quantum development tools, HUGR packages, quantum functions'
    },
    'circuit-optimizer': {
      title: 'Circuit Optimizer - BQSKit Quantum Circuit Optimization',
      description: 'Optimize quantum circuits using BQSKit algorithms. Convert OpenQASM code into optimized quantum circuits with reduced gate count, improved depth, and enhanced circuit efficiency for better quantum algorithm performance.',
      keywords: 'circuit optimizer, BQSKit, quantum optimization, quantum circuit optimization, gate reduction, circuit depth optimization, OpenQASM optimizer, quantum compiler, circuit synthesis, quantum algorithm optimization, quantum development tools'
    },
    'monaco-editor': {
      title: 'Monaco Editor Lab - Advanced Code Editor with File System',
      description: 'Professional web-based code editor powered by Monaco Editor with virtual file system, syntax highlighting, IntelliSense, and multi-language support. Perfect for coding, prototyping, and educational purposes.',
      keywords: 'Monaco Editor, code editor, online IDE, web editor, syntax highlighting, IntelliSense, file system, TypeScript editor, JavaScript editor, web development, coding lab, online compiler, code playground'
    }
  };

  getSeoData(route: string): SeoData {
    // Clean route (remove leading slash and parameters)
    const cleanRoute = route.replace(/^\//, '').split('?')[0].split('/').pop() || 'labs';
    return this.seoData[cleanRoute] || this.seoData['labs'];
  }
}
