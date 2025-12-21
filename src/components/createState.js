/**
 * createState.js
 *
 * High-performance, deeply reactive state management for vanilla JS apps.
 *
 * Feature Set:
 * - Deep reactivity: Nested objects, arrays, and Maps are fully reactive using Proxies. Any change, no matter how deep, is detected and can trigger subscribers.
 * - Path-based subscriptions: Subscribe to all changes, a specific property, or all descendants of a path (string or array).
 * - Selector-based subscriptions: Subscribe to changes in derived/computed values using a selector function.
 * - Batching: State change notifications are batched by default for performance; can be disabled per state instance.
 * - Computed/derived properties: Define computed or derived values that update automatically when dependencies change, accessible as properties on the state.
 * - Middleware/interceptors: Intercept, transform, or log state changes before subscribers are notified.
 * - Error handling: Subscriber errors are caught and logged, so one bad subscriber does not break the system.
 * - Unsubscribe: Remove listeners for both global and path-specific subscriptions.
 * - Extensibility: Easily add persistence, devtools, or TypeScript support as needed.
 *
 * ---
 *
 * The `change` object passed to subscribers has these properties:
 *   - path: Array of keys from root to the changed property (e.g. ['user','profile','city'])
 *   - newValue: The new value of the property after the change
 *   - oldValue: The previous value of the property before the change
 *   - prop: The property key that was changed (last element in path)
 *   - root: The root state proxy (entire state tree)
 *   - selectorValue (optional): The value returned by your selector function, if using selector-based subscription
 *
 * Example `change` object:
 *   {
 *     path: ['user', 'profile', 'city'],
 *     newValue: 'London',
 *     oldValue: 'Paris',
 *     prop: 'city',
 *     root: /* the root state proxy *\,
 *     selectorValue: 'AliceLondon' // only if using a selector
 *   }
 *
 * * ----------------------------------------------------------------------------
 * FUNCTION SIGNATURES:
 *
 * createState(initialState, options?)
 *   - initialState: object, array, or primitive
 *   - options: { batch?: boolean } (default: true)
 *   => Returns a reactive proxy with API methods.
 *
 * state.subscribe(fn, options?)
 *   - fn: (change) => void
 *   - options: {
 *       path?: string | string[],
 *       descendants?: boolean,
 *       selector?: (state) => any,
 *       batch?: boolean
 *     }
 *   => Subscribes to changes. Path/selector/descendants are optional.
 *
 * state.unsubscribe(fn)
 *   - fn: The original subscriber function passed to subscribe.
 *   => Unsubscribes the function.
 *
 * state.computed(name, dependencies, computeFn)
 *   - name: string (property name for computed value)
 *   - dependencies: array of string paths
 *   - computeFn: (state) => any
 *   => Adds a computed property to the state.
 *
 * state.derived(name, dependencies, computeFn)
 *   - Alias for .computed
 *
 * state.use(middlewareFn)
 *   - middlewareFn: (change) => change | null | undefined | false
 *   => Adds middleware to observe, modify, or block changes.
 *
 * ----------------------------------------------------------------------------
 * CHANGE OBJECT PROPERTIES:
 * - path: Array of keys to the changed property (e.g., ['user','profile','city'])
 * - newValue: New value of the property
 * - oldValue: Previous value of the property
 * - prop: The property key that changed (last in path)
 * - root: The root state proxy
 * - selectorValue: (optional) Value returned by selector function
 *
 * ----------------------------------------------------------------------------
 * NUANCES:
 * - For object/array state: access properties directly (e.g., state.user.name)
 * - For primitive state: use state.value (e.g., const state = createState(5); state.value = 10; console.log(state.value); // 10)
 *
 * ----------------------------------------------------------------------------
 * USAGE EXAMPLES:
 *
 * // 1. Basic usage
 * const state = createState({ user: { name: "Alice", profile: { city: "Paris" } } });
 * state.user.name = "Bob";
 *
 * // 2. Primitive state
 * const num = createState(5);
 * num.value = 10;
 *
 * // 3. Subscribe to all changes
 * state.subscribe(change => {
 *   console.log(change.path, change.newValue, change.oldValue);
 * });
 *
 * // 4. Subscribe to a specific path
 * state.subscribe(change => {
 *   console.log("City changed:", change.newValue);
 * }, { path: "user.profile.city" });
 *
 * // 5. Subscribe to all descendants of a path
 * state.subscribe(change => {
 *   console.log("Profile changed:", change.path, change.newValue);
 * }, { path: "user.profile", descendants: true });
 *
 * // 6. Selector-based subscription
 * state.subscribe(change => {
 *   console.log("Selector value changed:", change.selectorValue);
 * }, { selector: s => s.user.name + s.user.profile.city });
 *
 * // 7. Computed/derived property
 * state.computed("userInfo", ["user.name", "user.profile.city"], s => s.user.name + "@" + s.user.profile.city);
 * // or
 * state.derived("userInfo", ["user.name", "user.profile.city"], s => s.user.name + "@" + s.user.profile.city);
 * console.log(state.userInfo); // e.g., "Bob@Paris"
 *
 * // 8. Middleware: log and block invalid changes
 * state.use(change => {
 *   if (change.prop === "age" && change.newValue < 0) return null; // block
 *   console.log("Change:", change);
 *   return change;
 * });
 *
 * // 9. Unsubscribe
 * function onChange(change) { ... }
 * state.subscribe(onChange);
 * state.unsubscribe(onChange);
 *
 * ----------------------------------------------------------------------------
 *  API
 *
 * Usage Examples:
 *
 * // 1. Deep reactivity
 * // For object/array state, access properties directly:
 * const state = createState({ user: { name: "Alice" }, items: [1,2,3] });
 * state.user.name = "Bob"; // triggers subscribers
 * state.items.push(4);      // triggers subscribers
 *
 * // For primitive state, use .value:
 * const numState = createState(5);
 * numState.value = 10; // triggers subscribers
 * console.log(numState.value); // 10
 *
 * // 2. Path-based subscriptions
 * state.subscribe(change => { console.log("Any change", change); });
 * state.subscribe(change => { ... }, "user.profile.city");
 * state.subscribe(change => { ... }, ["user", "profile", "city"]);
 * state.subscribe(change => { ... }, { path: "user.profile", descendants: true });
 *
 * // 3. Selector-based subscriptions
 * // The selector function receives the state and returns a derived value.
 * // The subscription is triggered only when the selector's return value changes.
 * state.subscribe(change => {
 *   // change.selectorValue is the new derived value
 *   // change.root is the full state
 *   // You can still read or update state via change.root or the state variable
 *   console.log("Selector value:", change.selectorValue);
 * }, { selector: s => s.user.name + s.user.profile.city });
 *
 * // 4. Batching (default: on, can be disabled per state)
 * const state1 = createState({ value: 0 });
 * state1.subscribe(change => { console.log("Batched:", change.newValue); });
 * state1.value = 1; state1.value = 2; // Only one notification per tick
 * const state2 = createState({ value: 0 }, { batch: false });
 * state2.subscribe(change => { console.log("Immediate:", change.newValue); });
 * state2.value = 1; state2.value = 2; // Notified for each change
 *
 * // 5. Computed/derived properties (syntactic sugar)
 * // Using .computed (existing)
 * state.computed("userInfo", ["user.profile.city", "user.name"], () => {
 *   return state.user.name + "@" + state.user.profile.city;
 * });
 * console.log(state.userInfo); // "Bob@NY"
 * // Using .derived (alias for .computed)
 * state.derived("userCity", ["user.profile.city"], s => s.user.profile.city.toUpperCase());
 * console.log(state.userCity); // "LONDON"
 *
 * // 6. Middleware/interceptors
 * state.use(change => { console.log("Middleware:", change); return change; });
 *
 * // 7. Error handling
 * state.subscribe(() => { throw new Error("fail"); }); // Error is caught and logged
 *
 * // 8. Unsubscribe
 * function onChange(change) { ... }
 * state.subscribe(onChange, "user.name");
 * state.unsubscribe(onChange);
 *
 * // 9. Extensibility
 * // Add persistence, devtools, or TypeScript as needed.
 *
 * ---
 *
 * Nuance:
 * - For object/array state, access properties directly (e.g., state.user.name).
 * - For primitive state (number, string, boolean), use state.value to get/set the value.
 */

export function createState(initialState, { batch = true } = {}) {
  const HISTORY_KEY = "__uplot_history__";
  let history = [];
  // When true, don't record history (used while applying undo/redo)
  let _suppressHistory = false;
  // Simple redo stack for undone entries
  let _redoStack = [];
  const listeners = new Set();

  // --- Middleware ---
  const middlewares = [];

  // --- Batching ---
  let batchQueue = [];
  let batching = false;
  let rafId = null;

  function notify(change) {
    if (batch) {
      batchQueue.push(change);
      if (!batching) {
        batching = true;
        rafId = requestAnimationFrame(() => {
          const queue = batchQueue;
          batchQueue = [];
          batching = false;
          rafId = null;
          for (const fn of listeners) {
            for (const ch of queue) fn(ch);
          }
        });
      }
    } else {
      for (const fn of listeners) fn(change);
    }
  }

  // Helper: returns true for non-null objects/arrays/Map
  const isObject = (val) => val && typeof val === "object";
  const isMap = (val) => val instanceof Map;

  // --- Core: Deep reactive Proxy ---
  function createDeepProxy(target, path = []) {
    if (isMap(target)) {
      // Proxy for Map
      return new Proxy(target, {
        get(obj, prop, receiver) {
          if (prop === "__isReactive") return true;
          if (prop === "asArray") {
            // Return array of [key, value] pairs
            return () => Array.from(obj.entries());
          }
          if (["set", "delete", "clear"].includes(prop)) {
            // Wrap mutating methods to notify listeners
            return function (...args) {
              let oldValue, key;
              if (prop === "set") {
                key = args[0];
                oldValue = obj.get(key);
                let value = args[1];
                if (isObject(value) && !value?.__isReactive) {
                  value = createDeepProxy(value, path.concat([key]));
                  args[1] = value;
                }
                const result = Map.prototype.set.apply(obj, args);
                listeners.forEach((fn) =>
                  fn({
                    path: path.concat([key]),
                    newValue: obj.get(key),
                    oldValue,
                    prop: key,
                    root: proxy,
                  })
                );
                return result;
              } else if (prop === "delete") {
                key = args[0];
                oldValue = obj.get(key);
                const result = Map.prototype.delete.apply(obj, args);
                listeners.forEach((fn) =>
                  fn({
                    path: path.concat([key]),
                    newValue: undefined,
                    oldValue,
                    prop: key,
                    root: proxy,
                  })
                );
                return result;
              } else if (prop === "clear") {
                const oldEntries = Array.from(obj.entries());
                const result = Map.prototype.clear.apply(obj, args);
                oldEntries.forEach(([key, oldValue]) => {
                  listeners.forEach((fn) =>
                    fn({
                      path: path.concat([key]),
                      newValue: undefined,
                      oldValue,
                      prop: key,
                      root: proxy,
                    })
                  );
                });
                return result;
              }
            };
          }
          // For get, has, etc.
          const value = Reflect.get(obj, prop, receiver);
          // Deep-proxy Map values on get
          if (typeof prop === "string" && obj.has(prop)) {
            const v = obj.get(prop);
            if (isObject(v) && !v?.__isReactive) {
              const proxied = createDeepProxy(v, path.concat([prop]));
              obj.set(prop, proxied);
              return proxied;
            }
          }
          return value;
        },
      });
    }
    // Proxy for objects/arrays
    return new Proxy(target, {
      set(obj, prop, value) {
        const oldValue = obj[prop];
        // Deep-proxy new object/array/Map values
        if (isObject(value) && !value?.__isReactive) {
          value = createDeepProxy(value, path.concat(prop));
        }
        obj[prop] = value;
        // Notify all listeners
        listeners.forEach((fn) =>
          fn({
            path: path.concat(prop),
            newValue: value,
            oldValue,
            prop,
            root: proxy,
          })
        );
        return true;
      },
      get(obj, prop) {
        if (prop === "__isReactive") return true;
        if (prop === "asArray") {
          // Return a function that returns a shallow copy of the underlying array if this is an array
          return () => (Array.isArray(obj) ? Array.from(obj) : obj);
        }
        const value = obj[prop];
        // Lazy-proxy nested objects/arrays/Maps
        if (isObject(value) && !value?.__isReactive) {
          obj[prop] = createDeepProxy(value, path.concat(prop));
          return obj[prop];
        }
        return value;
      },
    });
  }

  // Wrap primitives in an object for consistent Proxying
  const root =
    initialState === null || typeof initialState !== "object"
      ? { value: initialState }
      : initialState;

  const proxy = createDeepProxy(root);

  // --- Advanced Subscription System ---
  /**
   * Subscribe to state changes.
   * @param {function(change)} fn - Called on any set, with {path, newValue, oldValue, prop, root}
   * @param {string|string[]|object} [options] - Optional. Path (string/array), or options object:
   *   { path, descendants, selector, middleware }
   * @returns {void}
   *
   * Example usage:
   *   // Subscribe to all changes
   *   state.subscribe(change => { ... });
   *
   *   // Subscribe to a specific property (string path)
   *   state.subscribe(change => { ... }, 'user.profile.city');
   *
   *   // Subscribe to a path and all descendants
   *   state.subscribe(change => { ... }, { path: 'user.profile', descendants: true });
   *
   *   // Subscribe with a selector
   *   state.subscribe(change => { ... }, { selector: s => s.user.profile.city });
   *
   *   // Unsubscribe
   *   state.unsubscribe(myCallback);
   */
  proxy.subscribe = (fn, options) => {
    let wrapped = fn;
    let pathArr, descendants, selector;
    if (typeof options === "string" || Array.isArray(options)) {
      pathArr = Array.isArray(options) ? options : options.split(".");
    } else if (typeof options === "object" && options) {
      if (options.path)
        pathArr = Array.isArray(options.path)
          ? options.path
          : options.path.split(".");
      descendants = !!options.descendants;
      selector = options.selector;
    }
    if (pathArr) {
      wrapped = (change) => {
        if (
          (descendants && pathArr.every((k, i) => k === change.path[i])) ||
          (!descendants &&
            change.path.length === pathArr.length &&
            change.path.every((k, i) => k === pathArr[i]))
        ) {
          try {
            fn(change);
          } catch (e) {
            console.error("Subscriber error:", e);
          }
        }
      };
    } else if (selector) {
      let lastValue = selector(proxy);
      wrapped = (change) => {
        const newValue = selector(proxy);
        if (newValue !== lastValue) {
          lastValue = newValue;
          try {
            fn({ ...change, selectorValue: newValue });
          } catch (e) {
            console.error("Subscriber error:", e);
          }
        }
      };
    } else {
      wrapped = (change) => {
        try {
          fn(change);
        } catch (e) {
          console.error("Subscriber error:", e);
        }
      };
    }
    listeners.add(wrapped);
    fn._wrappedListener = wrapped;
  };

  /**
   * Unsubscribe a listener.
   * @param {function(change)} fn
   */
  proxy.unsubscribe = (fn) => {
    listeners.delete(fn._wrappedListener || fn);
  };

  // --- Batching ---
  function notify(change) {
    if (batch) {
      batchQueue.push(change);
      if (!batching) {
        batching = true;
        rafId = requestAnimationFrame(() => {
          const queue = batchQueue;
          batchQueue = [];
          batching = false;
          rafId = null;
          for (const fn of listeners) {
            for (const ch of queue) fn(ch);
          }
        });
      }
    } else {
      for (const fn of listeners) fn(change);
    }
  }

  // --- Middleware ---
  proxy.use = (mw) => {
    middlewares.push(mw);
  };

  // --- Computed/Derived Properties ---
  proxy.computed = (name, deps, computeFn) => {
    let value = computeFn(proxy);
    Object.defineProperty(proxy, name, {
      get: () => value,
      enumerable: true,
      configurable: true,
    });
    deps.forEach((depPath) => {
      proxy.subscribe(() => {
        value = computeFn(proxy);
      }, depPath);
    });
  };
  // Syntactic sugar: .derived is an alias for .computed
  proxy.derived = proxy.computed;

  // --- Patch Proxy Handlers to use batching and middleware ---
  function applyMiddlewares(change) {
    let ch = change;
    for (const mw of middlewares) {
      ch = mw(ch) || ch;
    }
    return ch;
  }

  // Patch for objects/arrays
  function createDeepProxy(target, path = []) {
    if (isMap(target)) {
      // Proxy for Map
      return new Proxy(target, {
        get(obj, prop, receiver) {
          if (prop === "__isReactive") return true;
          if (prop === "asArray") {
            // Return array of [key, value] pairs
            return () => Array.from(obj.entries());
          }
          if (["set", "delete", "clear"].includes(prop)) {
            // Wrap mutating methods to notify listeners
            return function (...args) {
              let oldValue, key;
              if (prop === "set") {
                key = args[0];
                oldValue = obj.get(key);
                let value = args[1];
                if (isObject(value) && !value?.__isReactive) {
                  value = createDeepProxy(value, path.concat([key]));
                  args[1] = value;
                }
                const result = Map.prototype.set.apply(obj, args);
                listeners.forEach((fn) =>
                  fn({
                    path: path.concat([key]),
                    newValue: obj.get(key),
                    oldValue,
                    prop: key,
                    root: proxy,
                  })
                );
                return result;
              } else if (prop === "delete") {
                key = args[0];
                oldValue = obj.get(key);
                const result = Map.prototype.delete.apply(obj, args);
                listeners.forEach((fn) =>
                  fn({
                    path: path.concat([key]),
                    newValue: undefined,
                    oldValue,
                    prop: key,
                    root: proxy,
                  })
                );
                return result;
              } else if (prop === "clear") {
                const oldEntries = Array.from(obj.entries());
                const result = Map.prototype.clear.apply(obj, args);
                oldEntries.forEach(([key, oldValue]) => {
                  listeners.forEach((fn) =>
                    fn({
                      path: path.concat([key]),
                      newValue: undefined,
                      oldValue,
                      prop: key,
                      root: proxy,
                    })
                  );
                });
                return result;
              }
            };
          }
          // For get, has, etc.
          const value = Reflect.get(obj, prop, receiver);
          // Deep-proxy Map values on get
          if (typeof prop === "string" && obj.has(prop)) {
            const v = obj.get(prop);
            if (isObject(v) && !v?.__isReactive) {
              const proxied = createDeepProxy(v, path.concat([prop]));
              obj.set(prop, proxied);
              return proxied;
            }
          }
          return value;
        },
      });
    }
    // Proxy for objects/arrays
    return new Proxy(target, {
      set(obj, prop, value) {
        const oldValue = obj[prop];
        // Deep-proxy new object/array/Map values
        if (isObject(value) && !value?.__isReactive) {
          value = createDeepProxy(value, path.concat(prop));
        }
        obj[prop] = value;
        const change = applyMiddlewares({
          path: path.concat(prop),
          newValue: value,
          oldValue,
          prop,
          root: proxy,
        });
        notify(change);
        addHistory(change);
        return true;
      },
      get(obj, prop) {
        if (prop === "__isReactive") return true;
        if (prop === "asArray") {
          // Return a function that returns a shallow copy of the underlying array if this is an array
          return () => (Array.isArray(obj) ? Array.from(obj) : obj);
        }
        const value = obj[prop];
        // Lazy-proxy nested objects/arrays/Maps
        if (isObject(value) && !value?.__isReactive) {
          obj[prop] = createDeepProxy(value, path.concat(prop));
          return obj[prop];
        }
        return value;
      },
    });
  }

  // --- Flexible DOM Binding API ---
  /**
   * Bind a state property to a DOM property or attribute (one-way or two-way).
   *
   * @param {string|string[]} propertyPath - e.g. 'user.name' or ['user','name']
   * @param {string|Element} selectorOrElement - CSS selector or DOM element
   * @param {Object} options
   *   - {boolean} [twoWay=false]: If true, DOM updates state as well
   *   - {string} [eventType]: Which event to listen for (default: "input" for text, "change" for checkbox/select)
   *   - {string} [prop]: Property of element to bind (e.g. "value", "textContent", "innerHTML")
   *   - {string} [attr]: Attribute of element to bind (e.g. "data-user", "title")
   *   - {boolean} [selectiveUpdate=false]: If true, queue DOM updates on RAF frame (prevents layout thrashing on rapid updates)
   *   - {Object} [selectiveUpdate.queue]: Use external RAF queue (for multi-binding coordination)
   * @returns {Function} Call to unbind listeners
   *
   * @example
   * // Basic one-way binding
   * state.bindToDOM('user.name', '#nameInput');
   *
   * // Two-way binding with RAF update queuing
   * state.bindToDOM('user.name', '#nameInput', {
   *   twoWay: true,
   *   selectiveUpdate: true
   * });
   *
   * // Multiple bindings with shared RAF queue for coordinated updates
   * const updateQueue = createDOMUpdateQueue();
   * state.bindToDOM('prop1', el1, { selectiveUpdate: { queue: updateQueue } });
   * state.bindToDOM('prop2', el2, { selectiveUpdate: { queue: updateQueue } });
   */
  proxy.bindToDOM = function (propertyPath, selectorOrElement, options = {}) {
    const {
      twoWay = false,
      eventType,
      prop,
      attr,
      selectiveUpdate = false,
    } = options;

    // Accept dot, array, or string path
    const pathArr = Array.isArray(propertyPath)
      ? propertyPath
      : typeof propertyPath === "string"
      ? propertyPath.split(".")
      : [propertyPath];

    // Resolve DOM element
    let el =
      typeof selectorOrElement === "string"
        ? document.querySelector(selectorOrElement)
        : selectorOrElement;
    if (!el) {
      console.warn(
        `[createState] bindToDOM: Element not found for selector:`,
        selectorOrElement
      );
      return;
    }

    // Get/set nested property (supports Map)
    function getByPath(obj, path) {
      return path.reduce((o, key) => {
        if (isMap(o)) return o.get(key);
        return o ? o[key] : undefined;
      }, obj);
    }
    function setByPath(obj, path, value) {
      let o = obj;
      for (let i = 0; i < path.length - 1; i++) {
        o = isMap(o) ? o.get(path[i]) : o[path[i]];
      }
      if (isMap(o)) o.set(path[path.length - 1], value);
      else o[path[path.length - 1]] = value;
    }

    // --- DOM update logic ---
    function updateDOM() {
      let value = getByPath(proxy, pathArr);
      if (prop) {
        // Bind to any property (e.g. textContent, innerHTML)
        el[prop] = value ?? "";
      } else if (attr) {
        // Bind to any attribute
        if (value == null) el.removeAttribute(attr);
        else el.setAttribute(attr, value);
      } else if (el.type === "checkbox") {
        el.checked = !!value;
      } else if (
        el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA" ||
        el.tagName === "SELECT"
      ) {
        el.value = value ?? "";
      } else {
        el.textContent = value ?? "";
      }
    }

    // Initialize RAF queue if selectiveUpdate is enabled
    let updateQueue = null;
    if (selectiveUpdate) {
      if (selectiveUpdate.queue) {
        // Use provided external queue for coordination
        updateQueue = selectiveUpdate.queue;
      } else {
        // Try to use global RAF queue from domUpdateQueue utility
        // This is loaded on-demand to keep createState.js lightweight
        try {
          if (typeof window !== "undefined" && window._domUpdateQueue) {
            updateQueue = window._domUpdateQueue;
          } else {
            console.warn(
              "[createState] selectiveUpdate enabled but domUpdateQueue not initialized globally. Use import { getGlobalDOMUpdateQueue } from './utils/domUpdateQueue.js' to initialize."
            );
            selectiveUpdate = false;
          }
        } catch (e) {
          console.warn(
            "[createState] selectiveUpdate fallback error:",
            e.message
          );
          selectiveUpdate = false;
        }
      }
    }

    updateDOM();

    // Only update if this specific property was changed
    const listener = (change) => {
      if (
        change.path.length === pathArr.length &&
        change.path.every((k, i) => k === pathArr[i])
      ) {
        // Use RAF queue if selectiveUpdate is enabled
        if (
          selectiveUpdate &&
          updateQueue &&
          updateQueue.isActive &&
          updateQueue.isActive()
        ) {
          // Generate unique key for this binding (prevents duplicate updates to same element)
          const dedupeKey = `${
            el.id || el.className || el.tagName
          }_${pathArr.join(".")}`;
          updateQueue.queueUpdate({
            element: el,
            updateFn: updateDOM,
            dedupeKey,
          });
        } else {
          updateDOM();
        }
      }
    };
    proxy.subscribe(listener);

    // --- Two-way binding: DOM → state ---
    if (twoWay) {
      let readProp = prop;
      let evt =
        eventType ||
        (el.type === "checkbox"
          ? "change"
          : el.tagName === "SELECT"
          ? "change"
          : "input");
      const handler = (e) => {
        let val;
        if (attr) {
          val = el.getAttribute(attr);
        } else if (readProp) {
          val = el[readProp];
        } else if (el.type === "checkbox") {
          val = el.checked;
        } else {
          val = el.value;
        }
        setByPath(proxy, pathArr, val);
      };
      el.addEventListener(evt, handler);

      // Unbind both state and DOM listeners, clean up RAF queue reference
      return () => {
        proxy.unsubscribe(listener);
        el.removeEventListener(evt, handler);
        updateQueue = null; // Release reference to allow GC
      };
    } else {
      // Unbind state listener, clean up RAF queue reference
      return () => {
        proxy.unsubscribe(listener);
        updateQueue = null; // Release reference to allow GC
      };
    }
  };

  // --- History Tracking ---

  // Load existing history from localStorage (if any)
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) history = JSON.parse(saved);
  } catch (e) {
    console.warn("[createState] Failed to load history", e);
  }

  // Debounced save to localStorage to avoid blocking the main thread
  let _saveTimer = null;
  function saveHistoryToStorage() {
    if (_saveTimer) clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => {
      _saveTimer = null;
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
      } catch (e) {
        console.warn("[createState] Failed to save history", e);
      }
    }, 100);
  }

  function detectActionType(change) {
    const pathStr = change.path.join(".");
    if (pathStr.includes("lineColors")) return "color_change";
    if (pathStr.includes("title")) return "title_change";
    if (pathStr.includes("data")) return "data_change";
    if (pathStr.includes("channels")) return "channel_update";
    return "state_update";
  }

  function addHistory(change) {
    // Do not record history while we're applying an undo/redo
    if (_suppressHistory) return;

    // Only record history for changes that affect chart options.
    // This prevents internal API method assignments (subscribe/unsubscribe/etc.)
    // and unrelated state updates from polluting history.
    const relevantKeys = new Set([
      "yLabels",
      "lineColors",
      "yUnits",
      "axesScales",
      "xLabel",
      "xUnit",
      "title",
      "scales",
      "verticalLinesX",
      // include top-level channel groups
      "analog",
      "digital",
    ]);

    const pathMatches = (change.path || []).some((p) => relevantKeys.has(p));
    if (!pathMatches) return; // ignore non-chart-related changes

    const entry = {
      path: change.path,
      oldValue: change.oldValue,
      newValue: change.newValue,
      timestamp: Date.now(),
      actionType: detectActionType(change),
    };
    history.push(entry);
    // New history entry invalidates redo stack
    _redoStack.length = 0;
    saveHistoryToStorage();
  }
  proxy.getHistory = () => [...history];

  proxy.clearHistory = () => {
    history = [];
    saveHistoryToStorage();
  };

  // API helpers to suspend/resume history recording during bulk operations
  proxy.suspendHistory = () => {
    _suppressHistory = true;
  };
  proxy.resumeHistory = () => {
    _suppressHistory = false;
  };
  proxy.withoutHistory = (fn) => {
    const prev = _suppressHistory;
    _suppressHistory = true;
    try {
      return fn();
    } finally {
      _suppressHistory = prev;
    }
  };

  // Apply the last history entry's oldValue (undo)
  proxy.undoLast = () => {
    const last = history.pop();
    if (!last) return;
    // Safely traverse to the parent object for the path
    try {
      let target = proxy;
      for (let i = 0; i < last.path.length - 1; i++) {
        const k = last.path[i];
        if (target == null || typeof target !== "object") {
          // Can't apply undo safely — restore history and abort
          history.push(last);
          return;
        }
        target = target[k];
      }
      const key = last.path[last.path.length - 1];
      // Suppress recording while applying undo
      _suppressHistory = true;
      target[key] = last.oldValue;
      _suppressHistory = false;
      // Push into redo stack so the change can be redone later
      _redoStack.push(last);
      saveHistoryToStorage();
    } catch (err) {
      console.error("[createState] undoLast failed:", err);
      try {
        history.push(last);
      } catch (_) {}
    }
  };

  // Redo the most recently undone entry
  proxy.redoLast = () => {
    const entry = _redoStack.pop();
    if (!entry) return;
    try {
      let target = proxy;
      for (let i = 0; i < entry.path.length - 1; i++) {
        const k = entry.path[i];
        if (target == null || typeof target !== "object") {
          _redoStack.push(entry);
          return;
        }
        target = target[k];
      }
      const key = entry.path[entry.path.length - 1];
      _suppressHistory = true;
      target[key] = entry.newValue;
      _suppressHistory = false;
      // Re-add to history (redo is an applied change)
      history.push(entry);
      saveHistoryToStorage();
    } catch (err) {
      console.error("[createState] redoLast failed:", err);
      try {
        _redoStack.push(entry);
      } catch (_) {}
    }
  };

  proxy.getRedoStack = () => [..._redoStack];

  return proxy;
}

// Unwraps a state object or returns the value directly
export function unwrap(valOrState) {
  if (valOrState && typeof valOrState === "object" && "value" in valOrState)
    return valOrState.value;
  return valOrState;
}

/*
---------------------
----- EXAMPLES ------
---------------------

// 1. CREATE STATE
const state = createState({
  user: { name: "Alice", info: { city: "LA" } },
  checked: false,
  html: "<b>Hi</b>",
  settings: new Map([["theme", "light"], ["lang", "en"]])
});

// 2. GET/SET
state.user.name = "Bob";
state.user.info.city = "NY";
console.log(state.user.info.city);

// 3. MAP USAGE
state.settings.set("theme", "dark");
console.log(state.settings.get("theme"));
state.settings.set("profile", { city: "NY" });
state.settings.get("profile").city = "LA"; // Deep reactivity for Map values
state.settings.delete("lang");

// 4. SUBSCRIBE TO ALL CHANGES
state.subscribe(change => {
  console.log("Changed:", change.path.join("."), change.oldValue, "→", change.newValue);
});

// 5. DOM BINDING

// <input id="nameInput">   <span id="nameSpan"></span>
state.bindToDOM('user.name', '#nameInput', { twoWay: true });
state.bindToDOM('user.name', '#nameSpan', { prop: 'textContent' });

// <span id="themeDisplay"></span>
state.bindToDOM(['settings','theme'], '#themeDisplay', { prop: 'textContent' });

// <div id="profileBox"></div>
state.bindToDOM(['user','name'], '#profileBox', { attr: 'data-username' });

// <input type="checkbox" id="checkBox">
state.bindToDOM('checked', '#checkBox', { twoWay: true });

// <div id="htmlBox"></div>
state.bindToDOM('html', '#htmlBox', { prop: 'innerHTML' });

// 6. UNBINDING
const unbind = state.bindToDOM('user.name', '#nameInput', { twoWay: true });
unbind();

*/
