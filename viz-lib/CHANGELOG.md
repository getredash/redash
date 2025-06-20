# Change Log

## Unreleased

This major release of viz-lib represents a significant modernization of the visualization library with new features, enhanced user experience, and improved build infrastructure.

### 🎨 New Visualization Features

#### Color Scheme Support for Charts
- **Multiple Color Palettes**: Added support for Viridis, Tableau 10, and D3 Category 10 color schemes alongside the default Redash palette
- **Chart Editor Enhancement**: Users can now select different color schemes in the chart settings panel
- **Enhanced ColorPalette API**: New exports including `AllColorPalettes`, `AllColorPaletteArrays`, and `ColorPaletteTypes`
- **Discrete and Continuous Palettes**: Support for both discrete color sets and continuous color gradients

#### Pie Chart Enhancements
- **Sorting Toggle**: Added ability to enable/disable sorting on pie charts via a new checkbox in General Settings
- **Maintains Compatibility**: Default behavior preserved unless explicitly disabled

#### Interactive Chart Features
- **Chart Click Events**: Added interactive click functionality for chart visualizations
- **Drill-down Support**: Charts now support navigation and drill-down capabilities
- **Configuration Options**:
  - Toggle to enable/disable click events
  - Option to open links in new tab
  - Custom URL template support

#### Advanced Axis Formatting
- **D3 Format Strings**: Added support for custom X and Y axis tick formatting using D3 format specifications
- **Number Formatting**: Custom numeric format strings for precise axis label control
- **Date/Time Formatting**: Custom temporal format strings for time-based axes
- **Context Help**: Added TickFormatSpecs with documentation links for format guidance

### 📊 Visualization Improvements

#### Full Plotly.js Integration
- **Complete Plotly Library**: All Plotly visualization types now available through Custom chart type
- **Extended Options**: Access to the full range of Plotly visualization capabilities
- **Modern Webpack Support**: Added Node.js module fallbacks for browser compatibility

#### Data Processing Enhancements
- **Y-axis Aggregation**: Charts now properly aggregate Y column values instead of displaying only the last value
- **Better Data Handling**: Improved processing of multiple data points with identical X values
- **Chart Label Mapping**: Fixed Map() implementation for accurate chart label display

#### Heatmap Improvements
- **Better Color Contrast**: Enhanced annotation color selection for improved readability
- **Text Visibility**: Better text contrast on heatmap cells for clearer data presentation

### 🏗️ Build System Modernization

#### Webpack 5 Migration
- **Major Upgrade**: Migrated from Webpack 4.42.1 to 5.88.2
- **Modern Asset Handling**: Replaced `file-loader` with Webpack 5's built-in `asset/resource` modules
- **Optimized Configuration**: Streamlined build configuration with `assetModuleFilename: 'images/[name][ext]'`
- **Node.js Fallbacks**: Added fallbacks for Node.js modules (`fs: false, path: false`) for browser safety

#### Package Manager Migration
- **NPM to Yarn**: All build scripts migrated to use Yarn for better dependency management
- **Deterministic Builds**: Added `yarn.lock` for reproducible builds across environments
- **Improved Consistency**: Enhanced build reliability and dependency resolution

### 📦 Dependency Updates

#### Major Library Upgrades
- **Plotly.js**: Updated from 1.52.3 to 1.58.5 (latest visualization features and improvements)
- **Axios**: Upgraded from 0.19.2 to 0.28.0 with added axios-auth-refresh 3.3.6 for better request handling
- **Less**: Updated from 3.11.1 to 4.1.3 for modern CSS preprocessing capabilities
- **Babel Ecosystem**: Comprehensive update to 7.22.x series for modern JavaScript support
- **TypeScript Types**: Updated @types/plotly.js to 1.54.22 for better type safety

#### Build Tool Updates
- **Less-loader**: Updated from 5.0.0 to 11.1.3 with modernized configuration structure
- **Style-loader**: Upgraded from 1.1.4 to 3.3.3
- **Module Resolver**: Updated Babel plugin to 5.0.0
- **Testing Infrastructure**: Updated Jest and testing dependencies

#### Security Updates
- **DOMPurify**: Updated from 2.0.17 to 2.5.4 for enhanced XSS protection
- **Follow-redirects**: Security patches applied to prevent redirect vulnerabilities
- **Multiple Dependencies**: Various security vulnerability fixes across the dependency tree

### 🔧 Development Improvements

#### Enhanced Type Safety
- **Updated Type Definitions**: Better TypeScript coverage for Plotly.js and other major dependencies
- **Error Prevention**: Various TypeScript errors resolved throughout the codebase
- **Type Safety**: Improved development experience with better autocomplete and error detection

#### Modern React Support
- **React 16.14.0+**: Increased minimum React version requirement for modern features
- **Component Updates**: Enhanced compatibility with modern React patterns
- **Performance Optimizations**: Better integration with current React best practices

### 🗑️ Removals and Deprecations

#### Bundle Size Optimizations
- **Moment.js Removal**: Eliminated moment.js dependency to reduce bundle size
- **Modern Date Handling**: Replaced with native JavaScript Date APIs or smaller alternatives
- **File Loader Replacement**: Replaced with Webpack 5's built-in asset modules for cleaner configuration

#### Reverted Features
- **Table Fixed Columns**: Feature was added but later reverted due to compatibility issues
- **Counter Widget Changes**: Some font size modifications were reverted to maintain layout stability
- **Dependency Migrations**: Some library migrations were reverted to maintain stability

### ⚠️ Breaking Changes

#### API Changes
- **ColorPalette Structure**: Expanded ColorPalette API with new exports and structure
- **Minimum React Version**: Now requires React 16.14.0 or higher
- **Moment.js Dependency**: Applications relying on moment.js from viz-lib need alternative solutions

#### Build System Changes
- **Webpack 5 Requirement**: Consuming applications must be compatible with Webpack 5
- **Package Manager**: Yarn is now the preferred package manager for development
- **Asset Handling**: Changed asset module configuration may require updates in consuming applications

### 🔄 Migration Guide

#### For Consuming Applications
1. **Update React**: Ensure React version is 16.14.0 or higher
2. **Webpack 5**: Verify compatibility with Webpack 5 if using custom build configurations
3. **Color Palette API**: Update any code using ColorPalette exports to new structure
4. **Moment.js**: Replace any dependencies on moment.js with alternative date libraries

#### For Contributors
1. **Use Yarn**: Run `yarn install` instead of `npm install`
2. **Webpack 5**: Familiarize yourself with Webpack 5 configuration patterns
3. **TypeScript**: Enhanced type checking may require addressing new type errors

This release represents a major step forward in visualization capabilities and development experience, providing a solid foundation for future enhancements while maintaining compatibility for most existing use cases.

## v1.0.0 - 2021-01-XX

- Bumped to version 1.0.0 (no changelog was maintained for this release)

## v0.1.0 - 2020-05-05

- Created the library from Redash codebase