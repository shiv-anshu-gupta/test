# Complete COMTRADE Application Architecture with Linear Interpolation

Copy the code below and paste it into [Mermaid Online Editor](https://mermaid.live/)

```mermaid
graph TB
    START([Application Start]) --> LOAD_FILES

    subgraph FILE_LOADING["File Loading and Parsing Layer"]
        LOAD_FILES[User Selects COMTRADE Files<br/>CFG and DAT files]
        LOAD_FILES --> PARSE_CFG[parseCFG Function<br/>Extract channel metadata<br/>sampling rates and time data]
        LOAD_FILES --> PARSE_DAT[parseDAT Function<br/>Parse signal values<br/>ASCII or Binary format]

        PARSE_CFG --> CFG_OBJ[(Configuration Object<br/>analogChannels array<br/>digitalChannels array<br/>samplingRates<br/>timemult<br/>startTime)]

        PARSE_DAT --> INTERP["⭐ Linear Interpolation<br/>time = sampleNumber / samplingRate<br/>Uniform time spacing<br/>Multi-rate support"]
        INTERP --> DATA_OBJ[(Data Object<br/>time float array<br/>analogData 2D array<br/>digitalData 2D array<br/>startDateInfo)]
    end

    subgraph STATE_INIT["Reactive State Management"]
        CFG_OBJ --> INIT_CHANNEL_STATE[Initialize channelState<br/>using createState proxy]
        DATA_OBJ --> INIT_DATA_STATE[Initialize dataState<br/>using createState proxy]

        INIT_CHANNEL_STATE --> CHANNEL_STATE{{channelState<br/>ANALOG Properties<br/>yLabels string array<br/>lineColors hex array<br/>groups group names<br/>channelIDs unique IDs<br/>scales number array<br/>units string array<br/>starts sample indices<br/>durations time windows<br/>inverts boolean flags<br/>DIGITAL Properties<br/>yLabels string array<br/>lineColors hex array<br/>channelIDs unique IDs}}

        INIT_DATA_STATE --> DATA_STATE{{dataState<br/>ANALOG<br/>time array plus N series<br/>DIGITAL<br/>time array plus M series}}

        VLINES[Create verticalLinesX State] --> VLINES_STATE{{verticalLinesX State<br/>Array of X positions<br/>for measurement markers}}
    end

    subgraph CHART_RENDER["Chart Rendering Pipeline"]
        CHANNEL_STATE --> RENDER_START[renderComtradeCharts<br/>Main orchestrator function]
        DATA_STATE --> RENDER_START
        VLINES_STATE --> RENDER_START

        RENDER_START --> CLEAR_CONTAINER[Clear Charts Container<br/>Reset charts array to empty]
        CLEAR_CONTAINER --> SETUP_DND[setupChartDragAndDrop<br/>Enable chart reordering via drag]

        SETUP_DND --> ROUTE_CHANNELS{Route by<br/>Channel Type}

        ROUTE_CHANNELS -->|Analog Channels| AUTO_GROUP[autoGroupChannels Function<br/>Intelligent grouping by<br/>Name patterns<br/>Units<br/>Phases ABC<br/>Voltage Current]

        AUTO_GROUP --> ANALOG_RENDER[renderAnalogCharts<br/>Process all analog groups]

        ANALOG_RENDER --> LOOP_GROUPS[Iterate Each Group]

        LOOP_GROUPS --> CREATE_DRAGBAR[createDragBar<br/>Build drag handle UI<br/>Color indicators<br/>Channel labels<br/>Live label subscriptions]

        CREATE_DRAGBAR --> CREATE_CONTAINER[createChartContainer<br/>Build DOM structure<br/>Parent wrapper div<br/>Drag bar slot<br/>Chart canvas div<br/>Relative positioning]

        CREATE_CONTAINER --> BUILD_OPTIONS[createChartOptions<br/>Configure uPlot settings<br/>Axes with SI units<br/>Series styles<br/>Grid configuration<br/>Cursor sync settings<br/>Scale ranges]

        BUILD_OPTIONS --> FILTER_DATA[Filter Chart Data<br/>Map global channel indices<br/>Extract group series<br/>Build data matrix<br/>Include time axis]

        FILTER_DATA --> ADD_PLUGINS[Add Plugin Suite<br/>autoUnitScalePlugin<br/>verticalLinePlugin<br/>deltaBoxPlugin<br/>horizontalZoomPanPlugin]

        ADD_PLUGINS --> INIT_CHART[initUPlotChart<br/>Create uPlot instance<br/>Store series colors<br/>Save channel index mapping<br/>Set chart type flag]

        INIT_CHART --> ATTACH_RESIZE[Attach ResizeObserver<br/>Auto resize on container change]

        ATTACH_RESIZE --> TOOLTIP_EVENTS[Setup Tooltip Events<br/>mousemove show values<br/>mouseleave hide tooltip]

        TOOLTIP_EVENTS --> STORE_MAPPING[Store chart metadata<br/>channelIndices array<br/>type equals analog<br/>seriesColors array]

        STORE_MAPPING --> ANALOG_DONE[Analog Chart Created]

        ROUTE_CHANNELS -->|Digital Channels| FILTER_DIGITAL[findChangedDigitalChannelIndices<br/>Remove always 0 or 1 channels<br/>Keep only changing signals<br/>Optimize display]

        FILTER_DIGITAL --> DIGITAL_RENDER[renderDigitalCharts<br/>Process digital group]

        DIGITAL_RENDER --> DIG_DRAGBAR[Create Digital Drag Bar<br/>Build with channel labels]

        DIG_DRAGBAR --> DIG_CONTAINER[Create Digital Container<br/>Setup DOM structure]

        DIG_CONTAINER --> DIG_OPTIONS[Build Digital Chart Options<br/>Custom Y scale for stacking<br/>3 unit spacing per signal<br/>Fixed Y range<br/>Binary axis labels 0 and 1]

        DIG_OPTIONS --> TRANSFORM_DATA[Transform Data to Binary<br/>Normalize to 0 and 1 values<br/>Ensure consistent format]

        TRANSFORM_DATA --> DIG_PLUGINS[Add Digital Plugins<br/>digitalFillPlugin for rectangles<br/>verticalLinePlugin for markers]

        DIG_PLUGINS --> DIG_INIT[Initialize Digital Chart<br/>Create uPlot instance<br/>Store channel mapping<br/>Set type to digital<br/>Store display colors]

        DIG_INIT --> DIG_RESIZE[Attach ResizeObserver<br/>Handle container resize]

        DIG_RESIZE --> DIGITAL_DONE[Digital Chart Created]

        ANALOG_DONE --> CALC_DELTAS[calculateDeltas Function<br/>Compute measurements between<br/>vertical line markers]
        DIGITAL_DONE --> CALC_DELTAS

        CALC_DELTAS --> CHARTS_READY[Charts Array Populated<br/>All charts rendered<br/>Ready for interaction]
    end

    subgraph REACTIVE_SYSTEM["Reactive Update Manager - chartManager"]
        CHARTS_READY --> SUBSCRIBE[subscribeChartUpdates<br/>Setup state change listeners<br/>Monitor channelState<br/>Monitor dataState<br/>Monitor verticalLinesX]

        SUBSCRIBE --> LISTEN_CHANGES{Detect State<br/>Change Type}

        LISTEN_CHANGES -->|Color Property Changed| COLOR_UPDATE[In-Place Color Update<br/>Find chart by channelID<br/>Locate series position<br/>Call chart setSeries<br/>Update stroke and points<br/>Force visual redraw]

        LISTEN_CHANGES -->|Label Property Changed| LABEL_UPDATE[In-Place Label Update<br/>Match global channel index<br/>Update series label property<br/>Refresh chart display<br/>No full recreate needed]

        LISTEN_CHANGES -->|Group or Scale or Unit Changed| FULL_RECREATE[Full Chart Recreate<br/>Destroy existing chart<br/>Rebuild chart options<br/>Re-initialize uPlot instance<br/>Restore all subscriptions]

        LISTEN_CHANGES -->|Invert Flag Toggled| INVERT_HANDLER{Attempt<br/>Data Inversion}

        INVERT_HANDLER -->|Can Invert Safely| INVERT_PLACE[In-Place Data Inversion<br/>Analog multiply by negative 1<br/>Digital flip 0 to 1 and vice versa<br/>Update via chart setData<br/>Preserve chart instance]

        INVERT_HANDLER -->|Cannot Invert Safely| FULL_RECREATE

        LISTEN_CHANGES -->|Start or Duration Changed| TIME_WINDOW[Time Window Update<br/>Call resolveTimeRange helper<br/>Map sample indices to time<br/>Apply chart setScale for X axis<br/>Schedule retry if needed<br/>Force redraw after apply]

        LISTEN_CHANGES -->|Channel Added or Deleted| FULL_RECREATE

        COLOR_UPDATE --> FORCE_REDRAW[forceRedraw Utility<br/>Trigger visual refresh<br/>Use batch update<br/>Call setSize noop trick]
        LABEL_UPDATE --> FORCE_REDRAW
        INVERT_PLACE --> FORCE_REDRAW
        TIME_WINDOW --> FORCE_REDRAW

        FORCE_REDRAW --> REACTIVE_COMPLETE[Reactive Update Complete<br/>UI synchronized with state]
    end

    subgraph CHANNEL_EDITOR["Channel List Editor - Tabulator Integration"]
        USER_OPENS[User Clicks Edit Channels Button] --> OPEN_WINDOW[showChannelListWindow<br/>Open popup window<br/>Set dimensions 600x700]

        OPEN_WINDOW --> LOAD_DEPS[Load External Dependencies<br/>Tailwind CSS from CDN<br/>Tabulator CSS from CDN<br/>Tabulator JS library<br/>Wait for load complete]

        LOAD_DEPS --> INJECT_UI[Inject UI Structure<br/>Button bar with controls<br/>Add Row button<br/>Undo Redo buttons<br/>Download PDF button<br/>Root container div]

        INJECT_UI --> BUILD_TABLE[Build Tabulator Table<br/>Define columns<br/>ID display index<br/>Name editable text<br/>Color picker input<br/>Unit text field<br/>Group dropdown list<br/>Scale numeric input<br/>Start numeric input<br/>Duration numeric input<br/>Invert toggle switch<br/>Delete button]

        BUILD_TABLE --> POPULATE_ROWS[Populate Table Rows<br/>Map from channelState<br/>Analog channels first<br/>Digital channels after<br/>Assign tempClientId to each<br/>Apply group colors<br/>Set initial values]

        POPULATE_ROWS --> TABLE_READY[Tabulator Table Ready<br/>User can interact]

        TABLE_READY --> USER_EDITS{Detect User<br/>Action Type}

        USER_EDITS -->|Edit Any Cell| CELL_EDITED[cellEdited Event Handler<br/>Capture field name<br/>Capture row data object<br/>Capture new value<br/>Get channelID if present]

        CELL_EDITED --> LOCAL_CALLBACK[Call Local onChannelUpdate<br/>Legacy callback support<br/>For backwards compatibility]

        LOCAL_CALLBACK --> POST_MSG[postMessage to Opener<br/>Build payload object<br/>source ChildWindow<br/>type callback underscore field<br/>Include row data<br/>Include newValue<br/>Include channelID<br/>Target origin asterisk]

        POST_MSG --> PARENT_HANDLER[Parent Message Handler<br/>window addEventListener message<br/>Verify source ChildWindow<br/>Route by message type]

        PARENT_HANDLER --> UPDATE_ROUTE{Route Update<br/>by Field Type}

        UPDATE_ROUTE -->|callback_color| UPDATE_COLOR[Update channelState<br/>Set lineColors array element<br/>Trigger proxy notification]

        UPDATE_ROUTE -->|callback_channelName| UPDATE_NAME[Update channelState<br/>Set yLabels array element<br/>Trigger proxy notification]

        UPDATE_ROUTE -->|callback_group| UPDATE_GROUP[Update channelState<br/>Set groups array element<br/>Trigger proxy notification<br/>Re-render charts with new grouping]

        UPDATE_ROUTE -->|callback_scale| UPDATE_SCALE[Update channelState<br/>Set scales array element<br/>Trigger proxy notification]

        UPDATE_ROUTE -->|callback_start| UPDATE_START[Update channelState<br/>Set starts array element<br/>Trigger proxy notification]

        UPDATE_ROUTE -->|callback_duration| UPDATE_DUR[Update channelState<br/>Set durations array element<br/>Trigger proxy notification]

        UPDATE_ROUTE -->|callback_invert| UPDATE_INVERT[Update channelState<br/>Set inverts array element<br/>Trigger proxy notification]

        UPDATE_COLOR --> TRIGGER_REACTIVE[Trigger Reactive System<br/>State proxy notifies subscribers<br/>chartManager receives event]
        UPDATE_NAME --> TRIGGER_REACTIVE
        UPDATE_GROUP --> TRIGGER_REACTIVE
        UPDATE_SCALE --> TRIGGER_REACTIVE
        UPDATE_START --> TRIGGER_REACTIVE
        UPDATE_DUR --> TRIGGER_REACTIVE
        UPDATE_INVERT --> TRIGGER_REACTIVE

        USER_EDITS -->|Click Add Row Button| ADD_CHANNEL[Add Channel Handler<br/>Get selected type from dropdown<br/>Find max ID for type<br/>Create new row object<br/>Assign tempClientId<br/>Add to Tabulator table<br/>Post addChannel message]

        ADD_CHANNEL --> PARENT_ADD[Parent Add Channel Handler<br/>Add to cfg arrays<br/>Generate unique channelID<br/>Update channelState arrays<br/>Trigger re-render if needed<br/>Send ACK message back]

        PARENT_ADD --> ACK_MSG[ACK Message to Child<br/>type ack_addChannel<br/>Include tempClientId<br/>Include assigned channelID<br/>Include assignedIndex]

        ACK_MSG --> CHILD_ACK[Child Receives ACK<br/>Find row by tempClientId<br/>Update row with channelID<br/>Update row with index<br/>Clear tempClientId]

        CHILD_ACK --> TRIGGER_REACTIVE

        USER_EDITS -->|Click Delete Button| DELETE_CHANNEL[Delete Channel Handler<br/>Get row data with channelID<br/>Remove from Tabulator table<br/>Post delete message to parent]

        DELETE_CHANNEL --> PARENT_DELETE[Parent Delete Handler<br/>Find channel by ID<br/>Remove from cfg arrays<br/>Remove from channelState<br/>Trigger chart re-render<br/>Update all indices]

        PARENT_DELETE --> TRIGGER_REACTIVE

        TRIGGER_REACTIVE --> LISTEN_CHANGES

        TABLE_READY --> HISTORY_BTNS[History Button Handlers<br/>Undo button calls table.undo<br/>Redo button calls table.redo<br/>Update button states<br/>Disable if no history]

        TABLE_READY --> DOWNLOAD_BTN[Download PDF Handler<br/>Load jsPDF library<br/>Configure autoTable plugin<br/>Call table.download method<br/>Generate PDF file]
    end

    subgraph USER_INTERACTION["User Interaction Layer"]
        CHARTS_READY --> MOUSE_EVENTS[Attach Mouse Event Listeners<br/>on chart.over element]

        MOUSE_EVENTS --> MOUSE_TYPE{Classify Mouse<br/>Event Type}

        MOUSE_TYPE -->|mousemove| CALC_POS[Calculate Cursor Position<br/>Use chart.posToIdx method<br/>Convert X offset to sample index<br/>Get time value at index]

        CALC_POS --> SHOW_TOOLTIP[Show Tooltip Component<br/>Call updateTooltip function<br/>Format time value<br/>Format all series values<br/>Apply color coding<br/>Position at cursor<br/>Display in DOM]

        MOUSE_TYPE -->|click on chart| VLINE_TOGGLE[Toggle Vertical Line<br/>Check if line exists at position<br/>If exists remove from array<br/>If not add to array<br/>Update verticalLinesX state]

        VLINE_TOGGLE --> UPDATE_VLINES[Update Vertical Lines State<br/>Proxy triggers notification<br/>All subscribers notified]

        UPDATE_VLINES --> SYNC_CURSORS[Sync Across All Charts<br/>Use cursor.sync.key config<br/>All charts redraw markers<br/>Coordinated visual update]

        MOUSE_TYPE -->|mouseleave| HIDE_TOOLTIP[Hide Tooltip Component<br/>Call hideTooltip function<br/>Remove from DOM]

        CHARTS_READY --> DRAG_EVENTS[Attach Drag Event Listeners<br/>on dragBar elements<br/>via setupChartDragAndDrop]

        DRAG_EVENTS --> DRAG_TYPE{Classify Drag<br/>Event Type}

        DRAG_TYPE -->|dragstart| START_DRAG[Start Drag Operation<br/>Store dragged element<br/>Add dragging CSS class<br/>Set drag image<br/>Allow move effect]

        DRAG_TYPE -->|dragover| ALLOW_DROP[Allow Drop Operation<br/>Call preventDefault<br/>Show drop indicator<br/>Highlight drop zone]

        DRAG_TYPE -->|drop| REORDER[Reorder Chart Containers<br/>Get drop target element<br/>Move dragged before target<br/>Update DOM tree<br/>Preserve chart instances]

        DRAG_TYPE -->|dragend| END_DRAG[End Drag Operation<br/>Clear dragged reference<br/>Remove dragging class<br/>Clean up state]

        CHARTS_READY --> KEYBOARD[Attach Keyboard Listeners<br/>on window object<br/>Listen for shortcuts]

        KEYBOARD --> KEY_TYPE{Classify Key<br/>Combination}

        KEY_TYPE -->|Ctrl or Cmd plus Z| UNDO[History Undo Operation<br/>Call state.undoLast method<br/>Pop from history stack<br/>Restore oldValue to state<br/>Push to redo stack<br/>Suppress history recording]

        KEY_TYPE -->|Ctrl or Cmd plus Y| REDO[History Redo Operation<br/>Call state.redoLast method<br/>Pop from redo stack<br/>Restore newValue to state<br/>Push to history stack<br/>Suppress history recording]

        KEY_TYPE -->|Ctrl or Cmd plus Shift plus Z| REDO

        UNDO --> APPLY_HISTORY[Apply Historical State Change<br/>Traverse state path<br/>Set property to old value<br/>Trigger reactive system<br/>Update charts automatically]

        REDO --> APPLY_HISTORY

        APPLY_HISTORY --> LISTEN_CHANGES
    end

    subgraph ADVANCED_FEATURES["Advanced Features and Plugins"]
        ADD_PLUGINS --> AUTO_UNIT[autoUnitScalePlugin<br/>Monitor scale property changes<br/>Calculate SI prefix automatically<br/>Update axis labels dynamically<br/>Format tick values with prefix<br/>Support k M G T prefixes]

        ADD_PLUGINS --> VERT_LINE[verticalLinePlugin<br/>Draw vertical marker lines<br/>Sync across all charts<br/>React to state changes<br/>Click to add or remove<br/>Visual feedback on hover]

        ADD_PLUGINS --> DELTA_BOX[deltaBoxPlugin<br/>Measure time between lines<br/>Measure value differences<br/>Display formatted deltas<br/>Update on line movement<br/>Show in overlay box]

        ADD_PLUGINS --> ZOOM_PAN[horizontalZoomPanPlugin<br/>Synchronized zoom across charts<br/>Coordinated pan operations<br/>Mouse wheel zoom support<br/>Touch gesture support<br/>Maintain aspect ratios]

        DIG_PLUGINS --> DIGITAL_FILL[digitalFillPlugin<br/>Render filled rectangles for HIGH<br/>Color coded by channel<br/>Stacked vertical layout<br/>3 unit spacing per signal<br/>Efficient canvas rendering]

        CHANNEL_STATE --> HISTORY_TRACK[History Tracking System<br/>Record all state mutations<br/>Detect action types automatically<br/>Store in history array<br/>Maintain redo stack<br/>Persist to localStorage<br/>Debounced save for performance]

        HISTORY_TRACK --> PERSIST[Persist to localStorage<br/>Key based storage<br/>JSON serialization<br/>Debounced write<br/>Load on init<br/>Handle quota errors]

        CHANNEL_STATE --> DOM_BIND[DOM Binding API<br/>bindToDOM method<br/>Two way data sync<br/>Property binding support<br/>Attribute binding support<br/>Event listener attachment<br/>Automatic cleanup]

        CHANNEL_STATE --> COMPUTED[Computed Properties API<br/>Define derived values<br/>Auto update on dependency change<br/>Subscribe to dependency paths<br/>Efficient recalculation<br/>No manual refresh needed]

        CHANNEL_STATE --> MIDDLEWARE[Middleware System<br/>Intercept state changes<br/>Transform values<br/>Log mutations<br/>Validate inputs<br/>Block invalid changes]
    end

    subgraph UTILITY_LAYER["Utility Functions and Helpers"]
        BUILD_OPTIONS --> FORMAT_AXIS[makeAxisValueFormatter<br/>Format axis tick labels<br/>Apply SI prefix to values<br/>Handle scale factors<br/>Fixed decimal precision<br/>Return formatter function]

        FORMAT_AXIS --> GET_PREFIX[getSiPrefix Helper<br/>Calculate prefix from scale<br/>Support micro m k M G T<br/>Return appropriate string<br/>Handle edge cases]

        AUTO_GROUP --> EXTRACT_UNIT[extractUnit Helper<br/>Parse units from channel labels<br/>Use regex patterns<br/>Match common units<br/>Return unit string or empty]

        TIME_WINDOW --> NEAREST_IDX[getNearestIndex Helper<br/>Binary search algorithm<br/>Find closest time value<br/>Handle sorted arrays<br/>O log n complexity<br/>Return index]

        TOOLTIP_EVENTS --> CREATE_TT[createTooltip Function<br/>Generate tooltip DOM element<br/>Apply CSS styles<br/>Position absolutely<br/>Set z-index high<br/>Return element reference]

        CREATE_DRAGBAR --> SUBSCRIBE_LABELS[Subscribe to Label State<br/>Listen for yLabels changes<br/>Update drag bar text live<br/>Match by global index<br/>Efficient DOM updates<br/>No full re-render]

        INIT_CHART --> CHART_UTILS[Chart Utility Functions<br/>createChartContainer<br/>initUPlotChart wrapper<br/>destroyCharts cleanup<br/>ResizeObserver attachment<br/>Series color extraction]

        DIGITAL_RENDER --> DIG_UTILS[Digital Channel Utilities<br/>findChangedDigitalChannelIndices<br/>Filter static channels<br/>Optimize display list<br/>Reduce visual clutter<br/>Improve performance]
    end

    REACTIVE_COMPLETE --> END([Application Running and Ready])
    END --> USER_OPENS
    END --> MOUSE_EVENTS
    END --> DRAG_EVENTS
    END --> KEYBOARD

    classDef fileClass fill:#e3f2fd,stroke:#1976d2,stroke-width:3px
    classDef stateClass fill:#f3e5f5,stroke:#7b1fa2,stroke-width:3px
    classDef renderClass fill:#e8f5e9,stroke:#388e3c,stroke-width:3px
    classDef reactiveClass fill:#ffebee,stroke:#c62828,stroke-width:3px
    classDef editorClass fill:#fff3e0,stroke:#e65100,stroke-width:3px
    classDef interactClass fill:#e0f2f1,stroke:#00695c,stroke-width:3px
    classDef advClass fill:#fce4ec,stroke:#ad1457,stroke-width:3px
    classDef utilClass fill:#f1f8e9,stroke:#558b2f,stroke-width:3px
    classDef interpClass fill:#fff9c4,stroke:#f57f17,stroke-width:3px

    class LOAD_FILES,PARSE_CFG,PARSE_DAT fileClass
    class INTERP interpClass
    class INIT_CHANNEL_STATE,INIT_DATA_STATE,VLINES stateClass
    class RENDER_START,ANALOG_RENDER,DIGITAL_RENDER,INIT_CHART,DIG_INIT renderClass
    class SUBSCRIBE,COLOR_UPDATE,LABEL_UPDATE,FULL_RECREATE,REACTIVE_COMPLETE reactiveClass
    class OPEN_WINDOW,BUILD_TABLE,PARENT_HANDLER,TABLE_READY editorClass
    class MOUSE_EVENTS,DRAG_EVENTS,KEYBOARD interactClass
    class AUTO_UNIT,VERT_LINE,DELTA_BOX,ZOOM_PAN,DIGITAL_FILL,HISTORY_TRACK advClass
    class FORMAT_AXIS,EXTRACT_UNIT,NEAREST_IDX,CREATE_TT,CHART_UTILS,DIG_UTILS utilClass
```

## Key Updates from Original

### 🟨 Linear Interpolation Highlighted (Yellow)

**Location:** File Loading and Parsing Layer

**Changes:**

- Added `⭐ parseDAT Function` with note: **LINEAR INTERPOLATION APPLIED**
- New `INTERP` node (yellow highlighted) showing:
  - Formula: `time = sampleNumber / samplingRate`
  - Uniform time spacing
  - Multi-rate support
  - Ignores DAT timestamps

**Why This Matters:**

- Replaces non-uniform DAT file timestamps with calculated uniform time
- Enables perfect synchronization across multiple sampling rates
- Critical for accurate vertical line measurement and data visualization

### Color Coding

- 🔵 **Blue** - File Loading & Parsing (parseCFG, parseDAT)
- 🟪 **Purple** - Reactive State Management (channelState, dataState)
- 🟩 **Green** - Chart Rendering (renderComtradeCharts, etc)
- 🔴 **Red** - Reactive Updates (subscribeChartUpdates, etc)
- 🟧 **Orange** - Channel Editor (Tabulator integration)
- 🟦 **Teal** - User Interaction (Mouse, Drag, Keyboard)
- 🟩 **Pink** - Advanced Features (Plugins, History, etc)
- 🟩 **Light Green** - Utility Functions (Helpers, Formatters)
- 🟨 **Yellow** - Linear Interpolation (NEW!)

---

**How to Use:**

1. Go to [Mermaid Online Editor](https://mermaid.live/)
2. Copy the code from the markdown block above
3. Paste into the editor
4. Diagram renders automatically with full interactivity (zoom, pan, etc)
