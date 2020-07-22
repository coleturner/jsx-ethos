/**
 * Maps every JSX element to a numeric ID for the given file
 */

const dataSourceFile = 'data-source-file';
const dataJSXElement = 'data-jsx-element';

export default function (babel) {
  const { types: t } = babel;

  const sourceFileStr = 'my-file.js';
  let id = 0;

  return {
    name: 'ast-transform', // not required
    visitor: {
      JSXOpeningElement(path) {
        let dataSourceFileAttr = path.node.attributes.find(
          (attr) => attr.name.name === dataSourceFile
        );

        if (dataSourceFileAttr) {
          return;
        }

        dataSourceFileAttr = t.jsxAttribute(
          t.jsxIdentifier(dataSourceFile),
          t.stringLiteral(sourceFileStr)
        );

        const locStr = [
          [path.node.loc.start.line, path.node.loc.start.column].join(':'),
          [path.node.loc.end.line, path.node.loc.end.column].join(':'),
        ].join(',');
        const dataSourceLocationAttr = t.jsxAttribute(
          t.jsxIdentifier(dataJSXElement),
          t.stringLiteral(id.toString())
        );

        path.node.attributes.push(dataSourceFileAttr);
        path.node.attributes.push(dataSourceLocationAttr);

        id += 1;
      },
    },
  };
}
