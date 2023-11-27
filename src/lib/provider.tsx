import { createContext, useContext, Context, JSX } from 'solid-js'

import { ElectricClient } from 'electric-sql/client/model'
import { DbSchema } from 'electric-sql/client/model'

interface Props<S extends ElectricClient<DbSchema<any>>> {
  children?: JSX.Element
  db?: S
}

interface ElectricContext<S extends ElectricClient<DbSchema<any>>> {
  ElectricContext: Context<S | undefined>
  useElectric: () => S | undefined
  ElectricProvider: ({ children, db }: Props<S>) => JSX.Element
}

/**
 * This "static" context is used internally by our React hooks to access the {@link ElectricClient}.
 * It loses information about the actual types of the DB tables,
 * but we don't need that information in the React hooks.
 * However, users preferably don't lose this type information,
 * therefore, they can use {@link makeElectricContext}.
 */
let ElectricContext: Context<ElectricClient<DbSchema<any>> | undefined> =
  createContext<ElectricClient<DbSchema<any>> | undefined>(undefined)

export { ElectricContext }

/**
 * Call this function to create an Electric context, provider, and subscriber for your React application.
 * We can't provide a predefined context, provider, and subscriber because that would lose type information
 * as the types depend on the type of the database `S` that's provides as a type argument.
 *
 * @example
 * This example loses information about the concrete DB tables:
 * ```
 * const ctx = createContext<ElectricClient>()
 * ```
 */
export function createElectricContext<
  S extends ElectricClient<DbSchema<any>>
>(): Context<S | undefined> {
  const ctx = createContext<S | undefined>(undefined)

  ElectricContext = ctx as any

  return ctx
}