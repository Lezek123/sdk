import Link from '@docusaurus/Link'
import QueryNodeDefinition from '../../docs/definitions/_query-node.md'
import OrionDefinition from '../../docs/definitions/_orion.md'
import MetaprotocolDefinition from '../../docs/definitions/_metaprotocol.md'
import _ from 'lodash'

export const glossaryTerms = {
  'query-node': QueryNodeDefinition,
  'orion': OrionDefinition,
  'metaprotocol': MetaprotocolDefinition,
}

type GlossaryLinkProps = {
  to: keyof typeof glossaryTerms
}

export const GlossaryLink = ({
  to,
  children,
}: React.PropsWithChildren<GlossaryLinkProps>) => (
  <Link to={`/docs/glossary#${to}`} target="_blank">
    {children || _.startCase(to)}
  </Link>
)

export const Glossary = () => {
  return (
    <>
      {Object.entries(glossaryTerms).map(([key, DefinitionComponent]) => {
        return (
          <div id={key} key={key}>
            <DefinitionComponent />
          </div>
        )
      })}
    </>
  )
}
