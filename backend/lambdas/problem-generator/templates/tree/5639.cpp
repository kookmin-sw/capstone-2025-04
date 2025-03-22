// BOJ - 5637 이진 검색 트리

#include <bits/stdc++.h>
#define loop(i, s, n) for(ll i = s; i <= n; i++)
#define LOOP(i, s, n) for(ll i = s; i < n; i++)
#define ll long long int
 
using namespace std;
 
struct n {
    ll v = -1;
    n *l = nullptr, *r = nullptr;
};
n* input(n* m, ll k) {
    if(m == nullptr) {
        n* tmp = new n();
        tmp->v = k; tmp->l = nullptr; tmp->r = nullptr;
        return tmp;
    }
    else if(k < m->v) m->l = input(m->l, k);
    else m->r = input(m->r, k);
    return m;
}
void postorder_traversal(n* m) {
    if(m->l != nullptr) postorder_traversal(m->l);
    if(m->r != nullptr) postorder_traversal(m->r);
    cout << m->v << '\n';
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
 
    n* m = nullptr;

    while(1) {
        ll k; cin >> k;
        if(cin.eof()) break;

        m = input(m, k);
    }

    postorder_traversal(m);
}