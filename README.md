# jsx-ethos

Codename for a series of scripts to codemod a JSX codebase to Emotion

## How does it work

This is a proof of concept to discover whether it's possible to automate a codebase from JSX to Emotion CSS-in-JS. The goal of this concept is to map JSX elements to their styles when styles are not co-located. Then using that mapping to codegen styles

In order to do this, we would need to:

1. Unique identify JSX elements (`<div />` or `<MyComponent />`) to their DOM nodes
2. During the browser runtime, collect all of the styles that match to a DOM node
3. Map the styles back to the JSX elements
4. Codemod the styles into something usable.

## 1: JSX Identification

./babel-jsx-source-id.js is a Babel transform that adds two JSX attributes to every single JSX element:

- data-source-file: the name of the file
- data-jsx-element: a unique ID for the JSX element within that file.

### Example

**Input:**

```jsx
function IndexHTML() {
  return (
    <div className="something">
      <div className="else">
        Hello React!
        <b>cool beans</b>
      </div>
    </div>
  );
}
```

**Transform Output:**

```jsx
function IndexHTML() {
  return (
    <div
      className="something"
      data-source-file="path/to/index.js"
      data-jsx-element="0"
    >
      <div
        className="else"
        data-source-file="path/to/index.js"
        data-jsx-element="1"
      >
        Hello React!
        <b data-source-file="path/to/index.js" data-jsx-element="2">
          cool beans
        </b>
      </div>
    </div>
  );
}
```

This will allow us to later identify in the original code where the codemod should apply styles.

## 2: Identify Styles @ Browser Runtime

In order to gather the styles that apply to a JSX element, a runtime process is required. The runtime process that can adequately map styles to each DOM node that matches the style selector.

The caveat here is that the runtime will need to express all forms of the markup in order to match all of the styles.

**Requirements:**

1. Runtime process that matches styles to DOM node
2. Live counter or progress bar to indicate how many styles have been matched / unmatched.

**Out of this world idea:**
In order to express all of the markup (for the runtime process to match all the styles), a Babel transform could be considered which would mutate the JSX code. Similar to mutation testing transforms, it would create mutations of the component's props, state, and even mutate conditional renders.

### Runtime Process

Checkout [runtime.html](/runtime.html) for a demo on how to match styles to a DOM node. The process works as follows:

1. A Mutation Observer watches the DOM tree
2. As nodes are added, they are observed against all of the CSS rules on the page.
3. Matching selectors, including class selectors (:hover, :focus) and pseudo elements (::before, ::after) are matched to DOM node.
4. The DOM node is mapped using the JSX Identification Key with the matching CSS rule text

**Input:**

```html
<style media="screen" id="style">
  html,
  body {
    font-family: Helvetica;
  }

  .something {
    padding: 1em;
  }

  .else {
    color: green;
  }

  .else span {
    text-decoration: underline;
  }
</style>

<link rel="stylesheet" type="text/css" href="./style.css" />
<!-- 
// ===== style.css ======

body {
  font-weight: bold;
}

body span:hover {
  font-style: itatlic;
}

body b {
  color: blue;
}

body b:hover {
  color: blue;
}

body b::before {
  content: '';
}
body b:hover::before {
  content: '';
}
-->

<div class="something" data-source-file="path/to/index.js" data-jsx-element="0">
  <div class="else" data-source-file="path/to/index.js" data-jsx-element="1">
    Hello React!
    <b>cool beans</b>
  </div>
</div>
```

**Output:**

```json
{
  "my-file.js:0": {
    "markup": "<div class=\"something\" data-source-file=\"my-file.js\" data-jsx-element=\"0\">\n      <div class=\"else\" data-source-file=\"my-file.js\" data-jsx-element=\"1\">\n        Hello React!\n      </div>\n    </div>",
    "styles": [".something { padding: 1em; }"]
  },
  "my-file.js:1": {
    "markup": "<div class=\"else\" data-source-file=\"my-file.js\" data-jsx-element=\"1\">\n        Hello React!\n      </div>",
    "styles": [".else { color: green; }"]
  },
  "test.html:0": {
    "markup": "<b data-source-file=\"test.html\" data-jsx-element=\"0\"> cool beans</b>",
    "styles": [
      "body b { color: blue; }",
      "body b:hover { color: blue; }",
      "body b::before { content: \"\"; }",
      "body b:hover::before { content: \"\"; }"
    ]
  }
}
```

In the example above, the runtime process was able to match styles from both the inline `<style />` tag as well as an external stylesheet. It matched `:hover` and `::before` selectors on the `b` tag as well. This map can then power other automation in order to codegen styles.

## 3: Map the Styles Back to the JSX Elements (WIP)

**This section needs a lot of work**

The cascade-driven nature of CSS styles will make this effort the most significant to automate, and will require manual intervention thereafter. Both the runtime process and the later codegen will integrate with [scalpel](https://github.com/gajus/scalpel#pseudoclassselector) to manipulate rule selectors.

### Cascade and Specificity

We can map rules to the JSX elements. For specificity, we can assume a default order based on the order that the CSS rules appear in the stylesheets. The automation could even de-dupe duplicate style properties coming from multiple rules.

```JSX
function IndexHTML() {
    return (
        <div className="something" css={css`color: blue`}>
            <div className="else" css={css`color: green`}>
                Hello React!
                <b css={css`
                    body & {
                        color: blue;
                        &::before { content: "" }
                        &:hover { color: blue; }
                        &:hover::before { content: "" }
                    }
                `}>
                    cool beans
                </b>
            </div>
        </div>
    );
}
```

This is a good start, but ideally we would not need the `body` parent selector there, and in many other cases we would want to de-specify the selector as much as possible.

**Questions:**

1. Are there any reasonable assumptions we can make about specificity to de-specify a selector? For example (`body b, body b:hover`), if all of the rules for the `b` element have the same selector ancestry, what assumptios can we make?

   - For tag selectors (`b`, `span`, `div`), specificity shifting should be all-or-nothing.
   - For className selectors (`.blue`, `.red`), specificity shifting could possibly be more relaxed, and generate new parent selectors (`body &`, where the self selector `&` is `.blue`).
   - Need more input here.

2. For styles that cannot be manipulated, how should they be handled?
   - Similar to the earlier example, we can make use of the self selector to preserve the CSS rule as-is
   - Manual intervention should be prompted.

## 4: Codemod the styles into something usable.

TBD. This is largely a matter of code style. This could provide hatches where developers can specify they would prefer a styled component over an inline CSS attribute. It could also provide object styles.
