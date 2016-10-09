# injector-js 
AMD resolution modules

# Usage 
After injector.js ready, set funtions in global context

```shell
<html>
    <head>
        <script src="injector.js"></script>
        <script>
            window.onload = function(){
                var define = injector.define;
                var require = injector.require;

                // Ready for next
            };
        </script>
    <head>
</html>
```

```shell
// public/javascripts/dep1.js
define(function(){
    console.log('dep1');
});
```

```shell
// public/javascripts/dep2.js
define('public/javascripts/dep2', function(){
    console.log('dep2');
});
```

```shell
// public/javascripts/main.js
define([
    'public/javascripts/dep1',
    'public/javascripts/dep2'
], function(dep1, dep2){
    dep1();
    dep2();
    console.log('Hola');
});
```

```shell
// public/javascripts/app.js
require(['public/javascripts/main'], function(main){
    main();
});
```

## If there are multiple define modules in same file
## Set ID in each define
```shell
// public/javascripts/app.js
define('public/javascripts/dep1', function(){
    console.log('dep1');
});
define('public/javascripts/dep2', function(){
    console.log('dep2');
});
define('public/javascripts/main', [
    'public/javascripts/dep1',
    'public/javascripts/dep2'
], function(dep1, dep2){
    dep1();
    dep2();
    console.log('Hola');
});
require(['public/javascripts/main'], function(main){
    main();
});
```
