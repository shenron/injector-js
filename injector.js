/**
 * Define injector
 * Resolve AMD modules
 *
 * e.g: 
 * For require a module
 * > require([...], Function);
 *
 * For define a module
 * > define('MyModule', [...], Function);
 * > define([...], Function);
 * > define(Function);
 *
 * For rewrite Logger
 * > injector.params.Logger = Function
 *
 */
var injector = (function injector(){
    var Logger = function(){
    };
    // All injected dependencies
    injector._dependencies = {};

    /**
     * Define a module
     * with it name, dependencies, value
     * or dependencies, value
     * or value
     */
    injector.define = function define(name, deps, value){
        if(arguments.length < 3) {
            var allParametersSet = false;
            // deps, function
            if(Array.isArray(name)) {
                value = deps;
                deps = name;
                name = _getModuleName(getPathName());
                allParametersSet = true;
            }
            // just function
            if(typeof name === 'function' && !allParametersSet) {
                value = name;
                name = _getModuleName(getPathName());
                deps = [];
                allParametersSet = true;
            }
            // name, function
            if(typeof name === 'string' && 
                    (typeof deps === 'function' || typeof deps === 'object') && !allParametersSet){

                value = deps;
                deps = [];
                allParametersSet = true;
            }
        }
        value._metadata = {
            name: name
        };
        injector._dependencies[name] = {
            deps  : deps,
            value : value
        };
        return name;
    };
    /**
     * Execute function callback (value) when all dependencies loaded
     */
    injector.require = function require(deps, value, reject) {
        // All deps resolved
        if(injector.params && injector.params.Logger){
            Logger = injector.params.Logger;
        }
        _loadDeps({
            deps     : deps,
            value    : value,
            reject   : reject || function(){
            },
            callback : function(exec, treeDeps){
                treeDeps = treeDeps.reduce(function(previousDep, currentDep) {
                    return currentDep.concat(previousDep);
                });
                if(!(require.config && require.config.build)) {
                    exec();
                } else {
                    require.config.onResolveDeps(treeDeps, exec);
                }
            }
        }, deps, value);
    };

    /**
     * Return global context
     */
    function getGlobalContext() {
        return window;
    };

    /**
     * Reccursive function to load all dependencies
     */
    function _loadDeps(root, deps, value, treeDeps) {
        if(!treeDeps) {
            treeDeps = [];
        }
        if(deps.length > 0) {
            treeDeps.push(deps.map(_getModuleUrl));
        }
        deps.forEach(function(dep, i, arr){
            var depName = _getModuleName(dep);
            if(injector._dependencies[depName]){
                var module = injector._dependencies[depName];
                // don t reload a pending file
                if(!module.pending) {
                    _loadDeps(root, module.deps, module.value, treeDeps);
                }
            } else {
                _resolveFile(dep).then(function(dep){
                    _loadDeps(root, dep.deps, dep.value, treeDeps);
                }, function(args){
                    delete injector._dependencies[args.name];
                    root.reject(args);
                });
            }
        });
        // check if resolve reccursive
        function allResolved(deps) {
            var couldResolve = !!deps;
            var i = 0;
            while(couldResolve && i < deps.length) {
                var dep = deps[i];
                if(injector._dependencies[dep]) {
                    couldResolve = allResolved(injector._dependencies[dep].deps);
                } else {
                    couldResolve = false;
                }
                i++;
            }
            return couldResolve;
        }		
        // bind all function and return main
        function bind(args, value) {
            var i = 0,
            _f;
            while(i < args.length) {
                var dep = args[i];
                couldResolve = bind(injector._dependencies[dep].deps, injector._dependencies[dep].value);
                i++;
            }
            args = args.map(function(arg){
                return injector._dependencies[arg].value;
            });
            if(value._metadata) {
                _f = injector._dependencies[value._metadata.name].value;
                if(!value._metadata.binded && 
                        Object.prototype.toString.call(value).indexOf('Function') > 0 /*is function*/) {

                    injector._dependencies[value._metadata.name].value = Function.prototype.bind.apply(_f, [_f.prototype].concat(args));
                    // add static method
                    for(var _fKey in _f){
                        injector._dependencies[value._metadata.name].value[_fKey] = _f[_fKey];
                    }
                    value._metadata.binded = true;
                }
            } else {
                _f = value.bind.apply(value, [null].concat(args));
            }
            return _f;
        }

        root.deps = root.deps.map(_getModuleName);
        if(allResolved(root.deps) && !root.resolved) {
            root.resolved = true;
            root.callback.call(null, bind(root.deps, root.value), treeDeps);
        }
    }
    /**
     * Clear url for return ID
     * without http, .js
     */
    function _clearName(name) {
        var match = name.match(/http[s]?:\/\/[^\/]+(.*).js$/i);
        if(Array.isArray(match) && match[1]){
            return match[1];
        }
        if(name.substr(0, 1) === '/'){
            return name.substr(1, name.length);
        }

        // name is already clean
        return name;
    }
    function _resolveFile(file){
        var fileName = _getModuleName(file),
        download = function(file){
            return new Promise(function(resolve, reject){
                var head = document.getElementsByTagName('head')[0],
                script = document.createElement('script'),
                url = _getModuleUrl(file);

                // need to add default ext
                if(url.lastIndexOf('.') < (url.length - 5 /*max 4 car after ext*/)) {
                    url += '.js';
                }
                script.type = 'text/javascript';
                script.src = url;
                script.addEventListener('load', function(file, resolve){
                    var name = _getModuleName(file);
                    // non AMD module
                    if(typeof file !== 'string') {
                        injector.define(name, getGlobalContext()[name]);
                    }
                    Logger('[OK] Load: ' + _getModuleUrl(file));
                    return resolve(injector._dependencies[name]);
                }.bind(null, file, resolve), false);
                script.addEventListener('error', function(file, reject, e){
                    var name = _getModuleName(file);
                    return reject({
                        name: name,
                        e: e
                    });
                }.bind(null, file, reject), false);
                head.appendChild(script);
            });
        };

        injector._dependencies[fileName] = {
            pending: true
        };

        // start download
        return download(file);
    }
    /**
     * Dependencies could be String or object{name: url}
     * return url
     */
    function _getModuleUrl(dep) {
        if(typeof dep !== 'string'){
            return dep[Object.keys(dep)[0]];
        }
        return dep;
    }
    /**
     * Dependencies could be String or object{name: url}
     * return the name
     */
    function _getModuleName(dep) {
        if(typeof dep !== 'string'){
            return Object.keys(dep)[0];
        }
        return _clearName(dep);
    }
    /**
     * Get name for module
     */
    function getPathName() {
        var name = decodeURI(document.currentScript.src);
        return _clearName(name);
    };
    injector.define(injector);
    return injector;
})();
