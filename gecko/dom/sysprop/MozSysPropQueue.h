#ifndef mozilla_dom_sysprop_SysProp_Queue_h
#define mozilla_dom_sysprop_SysProp_Queue_h

template <typename T>
class SysProp_Queue
{
public:
    class Node
    {
    public:
        Node(T* pt):prev(NULL), next(NULL), data(pt) {}

        Node*   prev;
        Node*   next;
        T*      data;
    private:
        Node(){}
    };

    SysProp_Queue() : first(NULL), last(NULL), size(0) {}
    ~SysProp_Queue() { ClearData(); }

    inline int Length()const {return size;}
    void    Push(T* t);
    T*      Laster();
    T*      Pop();
    T*      Popback();
    void    Clear();
    void    ClearData();

protected:
    void DeleteNode(Node* pNode);
    T*  TakeFirst();
    T*  TakeLast();

    SysProp_Queue(const SysProp_Queue<T> &list);
    SysProp_Queue<T>& operator= (const SysProp_Queue<T> &list);
    T* operator[](int pos) const;

protected:
    Node*   first;
    Node*   last;
    int     size;
};

template <typename T>
void SysProp_Queue<T>::Push(T* t)
{
    Node* pNode = new Node(t);

    if (0 == size)
    {
        first = pNode;
        last = pNode;
    }
    else
    {
        first->prev = pNode;
        pNode->next = first;
        first = pNode;
    }

    size++;
}
template <typename T>
T* SysProp_Queue<T>:: Laster()
{
   if (0 == size)
     return NULL;
   else
     return last->data;
}

template <typename T>
T* SysProp_Queue<T>::Pop()
{
    return TakeFirst();
}

template <typename T>
T* SysProp_Queue<T>::Popback()
{
    return TakeLast();
}

template <typename T>
void SysProp_Queue<T>::DeleteNode(Node* pNode)
{
    if (0 == size || NULL == pNode)
        return;

    if (pNode == first)
    {
        if (1 == size)
        {
            first = NULL;
            last = NULL;
            delete pNode;
        }
        else
        {
            first = pNode->next;
            first->prev = NULL;
            delete pNode;
        }
    }
    else if (pNode == last)
    {
        if (1 == size)
        {
            first = NULL;
            last = NULL;
            delete pNode;
        }
        else
        {
            last = pNode->prev;
            last->next = NULL;
            delete pNode;
        }
    }
    else
    {
        pNode->prev->next = pNode->next;
        pNode->next->prev = pNode->prev;
        delete pNode;
    }

    size--;
}

template <typename T>
T* SysProp_Queue<T>::TakeFirst()
{
    if (0 == size)
        return NULL;

    T* t = first->data;
    DeleteNode(first);
    return t;
}

template <typename T>
T* SysProp_Queue<T>::TakeLast()
{
    if (0 == size)
        return NULL;

    T* t = last->data;
    DeleteNode(last);
    return t;
}

template <typename T>
void SysProp_Queue<T>::Clear()
{
    Node* pNode = first;
    while(NULL != pNode)
    {
        Node* tmp = pNode;
        pNode = pNode->next;
        delete tmp;
    }

    first = NULL;
    last = NULL;
    size = 0;
}

template <typename T>
void SysProp_Queue<T>::ClearData()
 {
    Node* pNode = first;
    while(NULL != pNode)
    {
        Node* tmp = pNode;
        pNode = pNode->next;
        delete tmp->data;
        delete tmp;
    }

    first = NULL;
    last = NULL;
    size = 0;
}

#endif

