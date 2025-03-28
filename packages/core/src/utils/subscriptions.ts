type SubscriptionCb<T> = (value: T) => void | Promise<void>
type ConditionFn<T> = (value: T) => Promise<boolean> | boolean
type UnsubscribeFn = () => void
type SubscribeFn<T> = (cb: SubscriptionCb<T>) => Promise<UnsubscribeFn>

export function promisifySubscription<T>(
  subscription: SubscribeFn<T>,
  conditionFn: ConditionFn<T>
) {
  return new Promise<void>((resolve, reject) => {
    let unsubscribe: UnsubscribeFn | undefined
    subscription(async (v) => {
      try {
        const result = await conditionFn(v)
        if (result) {
          unsubscribe?.()
          resolve()
        }
      } catch (e) {
        unsubscribe?.()
        reject(e)
      }
    })
      .then((unsubFn) => (unsubscribe = unsubFn))
      .catch((e) => reject(e))
  })
}
