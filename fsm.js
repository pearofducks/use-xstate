import { shallowRef, isRef, watch, onMounted, onBeforeUnmount } from 'vue';
import { createMachine, interpret } from '@xstate/fsm';

const getServiceValue = (service) => {
    let currentValue;
    service.subscribe((state) => currentValue = state).unsubscribe();
    return currentValue;
};

export function useMachine(stateMachine, options) {
    const service = interpret(createMachine(stateMachine.config, options ? options : stateMachine._options)).start();
    const state = shallowRef(getServiceValue(service));
    onMounted(() => {
        service.subscribe((currentState) => (state.value = currentState));
    });
    onBeforeUnmount(service.stop);
    return { state, send: service.send, service };
}

export function useService(service) {
    const serviceRef = isRef(service)
        ? service
        : shallowRef(service);
    const state = shallowRef(serviceRef.value.state);
    watch(serviceRef, (service, _, onCleanup) => {
        state.value = getServiceValue(service);
        const { unsubscribe } = service.subscribe((currentState) => {
            if (currentState.changed) {
                state.value = currentState;
            }
        });
        onCleanup(unsubscribe);
    }, {
        immediate: true
    });
    const send = (event) => serviceRef.value.send(event);
    return { state, send, service: serviceRef };
}
