// BOJ - 2250 트리의 높이와 너비

// idea 1. inorder traversal를 이용해서 root를 출력할 때마다 열을 증가한다.
// idea 2. inorder traversal에서 left나 right로 갈 경우 level를 1 증가한다.
#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
 
using namespace std;

struct p {
    int v, l, r;
};
int n, row, maxlv; map<int, p> m;
vector<pair<int, int> > gph[999]; // gph[lv] ~ list of (row, val) // max lv <= log2(N)

// O(N)
void inorder(int v, int lv) {
    maxlv = max(maxlv, lv);
    if(m[v].l != -1) inorder(m[v].l, lv + 1);
    gph[lv].push_back({++row, v});
    if(m[v].r != -1) inorder(m[v].r, lv + 1);
}

// O(N)
int rootNode() {
    int notroot[n + 1] = {0, };
    loop(i, 1, n) {
        if(m[i].l != -1) notroot[m[i].l] = 1;
        if(m[i].r != -1) notroot[m[i].r] = 1;
    }
    loop(i, 1, n) if(!notroot[i]) return i;
}

int comp(pair<int, int> p1, pair<int, int> p2) {
    return p1.first < p2.first;
}

void gphprint() {
    loop(i, 1, maxlv) {
        cout << i << ": ";
        for(pair<int, int> pp : gph[i]) cout << "(" << pp.first << ", " << pp.second << "), ";
        cout << '\n';
    }
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    cin >> n;
    LOOP(i, 0, n) {
        int v, l, r; cin >> v >> l >> r;
        m[v] = {v, l, r};
    }

    inorder(rootNode(), 1); // O(N + N) = O(N)
    loop(i, 1, maxlv) sort(gph[i].begin(), gph[i].end(), comp); // O(∑(lv*pow(2, lv)))

    //gphprint();
    int ans = -1, anslv = -1;
    loop(i, 1, maxlv) {
        int k = gph[i][gph[i].size() - 1].first - gph[i][0].first + 1;
        if(ans < k) ans = k, anslv = i;
    }

    cout << anslv << ' ' << ans << '\n';
}