import { computed, nextTick, ref, watch } from 'vue'
import utils from '../../utils/utils'
import type { TreeNode } from '../../types'
import type { SteTreeProps } from './props'

export default function useData({ props, emits }: {
  props: SteTreeProps
  emits: {
    (e: 'click', node: TreeNode<Record<string, any>>): void
    (e: 'beforeOpen', node: TreeNode<Record<string, any>>, suspend: () => void, next: () => void, stop: () => void): void
    (e: 'open', node: TreeNode<Record<string, any>>): void
    (e: 'close', node: TreeNode<Record<string, any>>): void
  }
}) {
  const dataOptions = ref(props.options)
  const setDataOptions = (options: TreeNode<Record<string, any>>[]) => {
    dataOptions.value = options
  }

  const viewOptions = ref<TreeNode<Record<string, any>>[]>([])
  const setViewOptions = (options: TreeNode<Record<string, any>>[]) => {
    viewOptions.value = options
  }

  const viewList = ref<TreeNode<Record<string, any>>[]>([])
  const setViewList = (options: TreeNode<Record<string, any>>[]) => {
    viewList.value = options
  }

  const dataSearchTitle = ref('')
  const setDataSearchTitle = (title: string) => {
    dataSearchTitle.value = title
  }

  const cmpPaddingLeft = computed(() => utils.formatPx(props.childrenPadding, 'num'))

  const formatTree = (tree: TreeNode<Record<string, any>>[], parentNode?: number | string, depth?: number) => {
    return utils.formatTree(
      tree,
      {
        valueKey: props.valueKey,
        childrenKey: props.childrenKey,
        otherAttributes(node) {
          return { open: false, loading: false, hasChildren: !!node[props.childrenKey]?.length }
        },
        parentNode,
        depth,
      },
    )
  }

  const rende = () => {
    nextTick(() => {
      if (!viewOptions?.value.length) {
        setViewList([])
        return
      }
      setViewList(utils.flattenTree(viewOptions.value, props.childrenKey, node => node?.open))
    })
  }

  const findNode = (tree: TreeNode<Record<string, any>>[], value: string | number) => {
    return utils.findTreeNode(tree, value, props.valueKey, props.childrenKey)
  }

  const beforeOpen = async (node: TreeNode<Record<string, any>>) => {
    let is_next = true
    const _beforeOpen = new Promise((resolve, reject) => {
      emits('beforeOpen', node, () => {
        is_next = false
        node.loading = true
      }, (children = []) => {
        const _children = formatTree(children, node[props.valueKey], node.depth + 1)

        resolve(_children)
      }, () => reject(new Error('beforeOpen stop')))
    })
    if (!is_next) {
      try {
        const children = await _beforeOpen
        node[props.childrenKey] = children
        node.loading = false
      }
      catch (e) {
        node.loading = false
        throw e
      }
    }
  }

  const setNodeOpen = (nodeValue: string | number, open: boolean) => {
    const node = findNode(viewOptions.value, nodeValue)
    if (!node)
      return null
    node.open = open
    if (props.accordion) {
      const sibling = viewList.value.filter(
        s => s.open && s.parentNode === node.parentNode && s[props.valueKey] !== node[props.valueKey],
      )
      sibling.forEach(s => setNodeOpen(s[props.valueKey], false))
    }
    if (dataOptions.value !== viewOptions.value) {
      // 同步到数据中
      const _node = findNode(dataOptions.value, nodeValue)
      if (_node)
        _node.open = open
    }
    return node
  }

  const open = async (value: string | number) => {
    const node = findNode(viewOptions.value, value)
    if (!node)
      return
    if (!dataSearchTitle.value)
      await beforeOpen(node)

    setNodeOpen(node[props.valueKey], true)
    if (node.parentNode !== '__root__') {
      const getParents = (_node: TreeNode<Record<string, any>>) => {
        const parents: TreeNode<Record<string, any>>[] = []
        const parent = findNode(viewOptions.value, _node.parentNode)
        if (parent) {
          parents.push(parent)
          if (parent.parentNode !== '__root__')
            parents.push(...getParents(parent))
        }
        return parents
      }
      const parents = getParents(node)
      parents.forEach((parent) => {
        if (parent.open)
          return
        setNodeOpen(parent[props.valueKey], true)
      })
    }
    rende()
  }

  const init = () => {
    setDataOptions(formatTree(props.options))
    setViewOptions(dataOptions.value)
    if (props.openNodes?.length)
      props.openNodes.forEach(v => open(v))
    else rende()
  }

  let searchTime = 0
  const setSearchTime = (callback: () => void, time: number) => {
    clearTimeout(searchTime)
    searchTime = setTimeout(() => {
      callback()
    }, time)
  }

  const onSearch = (title: string) => {
    setSearchTime(() => {
      if (!title) {
        if (viewOptions.value !== dataOptions.value)
          viewOptions.value = dataOptions.value

        rende()
        return
      }
      setViewOptions(utils.filterTree(
        dataOptions.value,
        node => node[props.titleKey]?.indexOf(title) !== -1,
        props.valueKey,
        props.childrenKey,
      ))
      rende()
    }, 500)
  }

  watch(() => props.options, () => init(), { immediate: true })

  watch(() => props.searchTitle, setDataSearchTitle, { immediate: true })

  watch(() => dataSearchTitle.value, onSearch, { immediate: true })

  const onClick = (node: TreeNode<Record<string, any>>) => {
    emits('click', node)
  }

  const closeNode = (value: string | number) => {
    const node = setNodeOpen(value, false)
    if (!node)
      return
    emits('close', node)
    rende()
  }

  const openNode = async (node: TreeNode<Record<string, any>>) => {
    try {
      await open(node[props.valueKey])
      emits('open', node)
      rende()
    }
    catch (e) {
      // TODO handle the exception
    }
  }

  const onOpen = (node: TreeNode<Record<string, any>>) => {
    if (node.open)
      closeNode(node[props.valueKey])
    else openNode(node)
  }

  return {
    init,
    viewList,
    cmpPaddingLeft,
    onClick,
    openNode,
    closeNode,
    onOpen,
    setDataSearchTitle,
  }
}
