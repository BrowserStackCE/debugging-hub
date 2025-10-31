import { useState, useCallback } from "react";

type AsyncFunction<TArgs extends any[], TReturn> = (...args: TArgs) => Promise<TReturn>;

interface UsePromiseResult<TArgs extends any[], TReturn> {
    execute: (...args: TArgs) => Promise<TReturn | undefined>;
    isLoading: boolean;
    error: Error | null;
    data: TReturn | null;
}

export function usePromise<TArgs extends any[], TReturn>(
    asyncFunction: AsyncFunction<TArgs, TReturn>
): [UsePromiseResult<TArgs, TReturn>['execute'], UsePromiseResult<TArgs, TReturn>['isLoading'], UsePromiseResult<TArgs, TReturn>['data'], UsePromiseResult<TArgs, TReturn>['error']] {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [data, setData] = useState<TReturn | null>(null);

    const execute = useCallback(
        async (...args: TArgs): Promise<TReturn | undefined> => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await asyncFunction(...args);
                setData(response);
                return response;
            } catch (err) {
                const errorObj = err instanceof Error ? err : new Error(String(err));
                setError(errorObj);
                throw err
            } finally {
                setIsLoading(false);
            }
        },
        [asyncFunction]
    );

    return [execute, isLoading, data, error];
}
