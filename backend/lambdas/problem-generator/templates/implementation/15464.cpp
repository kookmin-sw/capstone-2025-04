// BOJ - 15464 The Bovine Shuffle

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)

using namespace std;
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    int n; cin >> n;
    int a[n + 1] = {0, }, o[n + 1] = {0, };
    loop(i, 1, n) {
        int k; cin >> k; a[i] = k;
    }
    loop(i, 1, n) {
        int k; cin >> k; o[i] = k;
    }
    loop(i, 1, n) cout << o[a[a[a[i]]]] << '\n';
    
}