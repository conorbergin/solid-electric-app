import { createResource, createSignal, onCleanup, createEffect, useContext, Resource, Accessor, getOwner, runWithOwner } from 'solid-js'

import { QualifiedTablename, hasIntersection } from 'electric-sql/util'
import { Notifier } from 'electric-sql/notifiers'
import { Store, StoreNode, createStore, reconcile } from 'solid-js/store'

export interface LiveResultContext<T> {
  (): Promise<LiveResult<T>>
  sourceQuery?: Record<string, any> | undefined
}

/**
 * A live result wrapping the `result` as well as the concerned table names.
 * The table names are used to subscribe to changes to those tables
 * in order to re-run the live query when one of the tables change.
 */
export class LiveResult<T> {
  constructor(public result: T, public tablenames: QualifiedTablename[]) { }
}
export interface ResultData<T> {
  error?: unknown
  results?: T
  updatedAt?: Date
}

function successResult<T>(results: T): ResultData<T> {
  return {
    error: undefined,
    results: results,
    updatedAt: new Date(),
  }
}

function errorResult<T>(error: unknown): ResultData<T> {
  return {
    error: error,
    results: undefined,
    updatedAt: new Date(),
  }
}


// This wraps a resource, a solid-js signal thar models an async request
// and works with the Suspense Component
// You should wrap your component in an error boundary


// export function createLiveQuery<T>(query: () => {}, params?: Accessor<any>): Resource<T>[] {
//   const electric = useContext(ElectricContext)!
//   let tableNames: QualifiedTablename[] | null = null

//   const firstRun = async (params) => query(params).then(r => {
//     if (!tableNames) {
//       tableNames = r.tablenames
//     }
//     return r.result
//   })

//   const [result, { refetch }] = createResource<T>(params?,async () => query().then(r => {
//     if (!tableNames) {
//       tableNames = r.tablenames
//     }
//     return r.result
//   }))

//   const key = electric.notifier.subscribeToDataChanges(notification => {
//     if (tableNames) {
//       const changedTablenames = electric.notifier.alias(notification)
//       if (hasIntersection(tableNames, changedTablenames)) {
//         refetch()
//       }
//     }
//   })

//   onCleanup(() => {
//     electric.notifier.unsubscribeFromDataChanges(key)
//   })

//   return [result]
// }


// export function createDerivedQuery<T>(notifier: Notifier, queryOrAccessor: Accessor<LiveResultContext<T>>): Accessor<T | undefined>[] {

//   const [result, setResult] = createSignal<T | undefined>(undefined)

//   let tableNames: QualifiedTablename[] | null = null

//   createEffect(() => {
//     tableNames = null
//     const query = queryOrAccessor()
//     query().then(r => {
//       tableNames = r.tablenames;
//       setResult(() => r.result)
//     })

//     const key = notifier.subscribeToDataChanges(notification => {
//       if (tableNames) {
//         const changedTablenames = notifier.alias(notification)
//         if (hasIntersection(tableNames, changedTablenames)) {
//           query().then(r => setResult(() => r.result))
//         }
//       }
//     })

//     onCleanup(() => notifier.unsubscribeFromDataChanges(key))
//   })

//   return [result, setResult]
// }
export function createLiveQuery<T>(notifier: Notifier, query: LiveResultContext<T>): { value: T | undefined } {

  const [state, setState] = createStore<{ value: T | undefined }>({ value: undefined })
  let tableNames: QualifiedTablename[]

  query().then(r => {
    tableNames = r.tablenames
    setState({ value: r.result })
  })

  const unsub = notifier.subscribeToDataChanges(n => {
    if (hasIntersection(notifier.alias(n), tableNames)) {
      query().then(r => setState(reconcile({ value: r.result })))
    }
  })

  onCleanup(() => notifier.unsubscribeFromDataChanges(unsub))

  return state
}



export function createDerivedQuery<T>(notifier: Notifier, queryFn: () => LiveResultContext<T>): { value: T | undefined } {

  const [state, setState] = createStore<{ value: T | undefined }>({ value: undefined })
  let tableNames: QualifiedTablename[]

  createEffect(() => {
    const query = queryFn()
    query().then(r => {
      tableNames = r.tablenames
      setState({ value: r.result })
    })

    const unsub = notifier.subscribeToDataChanges(n => {
      if (hasIntersection(notifier.alias(n), tableNames)) {
        query().then(r => setState(reconcile({ value: r.result })))
      }
    })

    onCleanup(() => notifier.unsubscribeFromDataChanges(unsub))
  })
  return state
}
